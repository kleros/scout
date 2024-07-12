import React, { Dispatch, SetStateAction, useEffect, useState } from 'react'
import styled from 'styled-components'
import ipfsPublish from 'utils/ipfsPublish'
import { getIPFSPath } from 'utils/getIPFSPath'
import UploadIcon from 'tsx:svgs/icons/upload.svg'

const StyledLabel = styled.label`
  cursor: pointer;
  width: fit-content;
  display: flex;  
  align-items: center;
  padding: 10px 20px;
  background-color: #855caf;
  color: white;
  border-radius: 12px;
  position: relative;
  &:hover {
    background-color: #9277b1;
  }
`

const StyledInput = styled.input`
  opacity: 0;
  width: 0.1px;
  height: 0.1px;
  position: absolute;
`

const StyledUploadIcon = styled(UploadIcon)`
  margin-left: 5px;
`

interface ImageUploadProps {
  path: string
  setPath: Dispatch<SetStateAction<string>>
  registry: string
  setError: Dispatch<SetStateAction<string | null>>
}

const ImageUpload: React.FC<ImageUploadProps> = ({ path, setPath, registry, setError }) => {
  const [imageFile, setImageFile] = useState<File | null>(null)

  const validateImage = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (file.size > 4 * 1024 * 1024) {
        resolve('Image is too large (>4 MB)');
        return;
      }

      if (registry === 'Tokens' && file.type !== 'image/png') {
        resolve('Image must be in PNG format');
        return;
      }
    });
  };

  useEffect(() => {
    if (!imageFile) return
    const uploadImageToIPFS = async () => {
      const error = await validateImage(imageFile);
      if (error) {
        setError(error);
        return;
      }

      const data = await new Response(new Blob([imageFile])).arrayBuffer()
      const ipfsObject = await ipfsPublish(imageFile.name, data)
      const ipfsPath = getIPFSPath(ipfsObject)
      console.log({ ipfsPath })
      setPath(ipfsPath)
      setError(null);
    }
    uploadImageToIPFS()
  }, [imageFile])

  return (
    <>
      Image
      <StyledLabel>
        Upload Image <StyledUploadIcon />
        <StyledInput
          type="file"
          accept={registry === 'Tokens' ? ".png" : "image/*"}
          onChange={(e) => {
            setImageFile(e.target.files ? e.target.files[0] : null)
          }}
        />
      </StyledLabel>
      {path && (
        <img
          width={200}
          height={200}
          src={`https://cdn.kleros.link${path}`}
          alt="preview"
        />
      )}
    </>
  )
}

export default ImageUpload
