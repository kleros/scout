import { defineConfig } from '@wagmi/cli'
import { react, actions } from '@wagmi/cli/plugins'
import klerosCurateAbi from './src/utils/abi/kleros-curate-abi.json'
import klerosLiquidAbi from './src/utils/abi/kleros-liquid-abi.json'

export default defineConfig({
  out: 'src/hooks/contracts/generated.ts',
  contracts: [
    {
      name: 'KlerosCurate',
      abi: klerosCurateAbi,
    },
    {
      name: 'KlerosLiquid', 
      abi: klerosLiquidAbi,
    },
  ],
  plugins: [
    react(),
    actions(),
  ],
})