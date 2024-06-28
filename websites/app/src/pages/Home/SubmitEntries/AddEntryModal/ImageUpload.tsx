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

const ImageUpload: React.FC<{
  path: string
  setPath: Dispatch<SetStateAction<string>>
}> = (p) => {
  const [imageFile, setImageFile] = useState<any>()

  useEffect(() => {
    if (!imageFile) return
    const uploadImageToIPFS = async () => {
      const data = await new Response(new Blob([imageFile])).arrayBuffer()
      const ipfsObject = await ipfsPublish(imageFile.name, data)
      const ipfsPath = getIPFSPath(ipfsObject)
      console.log({ ipfsPath })
      p.setPath(ipfsPath)
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
          onChange={(e) => {
            setImageFile(e.target.files ? e.target.files[0] : null)
          }}
        />
      </StyledLabel>
      {p.path && (
        <img
          width={200}
          height={200}
          src={`https://cdn.kleros.link${p.path}`}
          alt="preview"
        />
      )}
    </>
  )
}

export default ImageUpload
