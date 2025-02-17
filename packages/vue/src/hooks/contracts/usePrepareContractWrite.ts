import type {
  GetWalletClientResult,
  PrepareWriteContractConfig,
  PrepareWriteContractResult,
  WalletClient,
} from '@wagmi/core'
import { prepareWriteContract } from '@wagmi/core'
import { getCallParameters } from '@wagmi/core/internal'
import type { Abi } from 'abitype'
import type { CallParameters, GetFunctionArgs } from 'viem'
import { computed, reactive, toRefs, unref, watchEffect } from 'vue-demi'
import type { UnwrapRef } from 'vue-demi'

import type {
  DeepMaybeRef,
  PartialBy,
  QueryConfig,
  QueryFunctionArgs,
  ShallowMaybeRef,
} from '../../types'
import { cloneDeepUnref, updateState } from '../../utils'
import { useNetwork } from '../accounts'
import { useQuery } from '../utils'
import { useWalletClient } from '../viem'

export type UsePrepareContractWriteConfig<
  TAbi extends Abi | readonly unknown[] = Abi,
  TFunctionName extends string = string,
  TChainId extends number = number,
  TWalletClient extends WalletClient = WalletClient,
> = PartialBy<
  ShallowMaybeRef<
    Omit<
      PrepareWriteContractConfig<TAbi, TFunctionName, TChainId, TWalletClient>,
      'args'
    >
  >,
  'abi' | 'address' | 'functionName'
> &
  Partial<DeepMaybeRef<GetFunctionArgs<TAbi, TFunctionName>>> &
  QueryConfig<PrepareWriteContractResult<TAbi, TFunctionName, TChainId>, Error>

type QueryKeyArgs = Omit<DeepMaybeRef<PrepareWriteContractConfig>, 'abi'>
type QueryKeyConfig = Pick<UsePrepareContractWriteConfig, 'scopeKey'> &
  ShallowMaybeRef<{
    activeChainId?: number
    walletClientAddress?: string
  }>

function queryKey({
  accessList,
  account,
  activeChainId,
  args,
  address,
  blockNumber,
  blockTag,
  chainId,
  functionName,
  gas,
  gasPrice,
  maxFeePerGas,
  maxPriorityFeePerGas,
  nonce,
  scopeKey,
  walletClientAddress,
  value,
}: QueryKeyArgs & QueryKeyConfig) {
  return [
    {
      entity: 'prepareContractTransaction',
      accessList,
      account,
      activeChainId,
      address,
      args,
      blockNumber,
      blockTag,
      chainId,
      functionName,
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      scopeKey,
      walletClientAddress,
      value,
    },
  ] as const
}

function queryFn({
  abi,
  walletClient,
}: {
  abi?: Abi | readonly unknown[]
  walletClient?: GetWalletClientResult
}) {
  return ({
    queryKey: [
      {
        accessList,
        account,
        args,
        address,
        blockNumber,
        blockTag,
        chainId,
        functionName,
        gas,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        nonce,
        value,
      },
    ],
  }: UnwrapRef<QueryFunctionArgs<typeof queryKey>>) => {
    if (!abi) throw new Error('abi is required')
    if (!address) throw new Error('address is required')
    if (!functionName) throw new Error('functionName is required')
    return prepareWriteContract({
      // TODO: Remove cast and still support `Narrow<TAbi>`
      abi: abi as Abi,
      accessList,
      account,
      args,
      address,
      blockNumber,
      blockTag,
      chainId,
      functionName,
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      walletClient,
      value,
    } as PrepareWriteContractConfig)
  }
}

/**
 * @description Hook for preparing a contract write to be sent via [`useContractWrite`](/docs/hooks/useContractWrite).
 *
 * Eagerly fetches the parameters required for sending a contract write transaction such as the gas estimate.
 *
 * @example
 * import { useContractWrite, usePrepareContractWrite } from 'use-wagmi'
 *
 * const { config } = usePrepareContractWrite({
 *  address: '0xecb504d39723b0be0e3a9aa33d646642d1051ee1',
 *  abi: wagmigotchiABI,
 *  functionName: 'feed',
 * })
 * const { data, isLoading, isSuccess, write } = useContractWrite(config)
 *
 */
export function usePrepareContractWrite<
  TAbi extends Abi | readonly unknown[],
  TFunctionName extends string,
  TChainId extends number,
>(
  {
    address,
    abi,
    functionName,
    chainId,
    args,
    cacheTime,
    enabled = true,
    scopeKey,
    staleTime,
    suspense,
    onError,
    onSettled,
    onSuccess,
    ...config
  }: UsePrepareContractWriteConfig<TAbi, TFunctionName, TChainId> = {} as any,
) {
  const { chain: activeChain } = useNetwork()
  const { data: walletClient } = useWalletClient({ chainId: chainId as number })

  const _config = cloneDeepUnref(config)
  const {
    accessList,
    account,
    blockNumber,
    blockTag,
    gas,
    gasPrice,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce,
    value,
  } = getCallParameters(_config as CallParameters)

  const prepareContractWriteQuery = useQuery(
    queryKey({
      accessList,
      account,
      activeChainId: activeChain?.value?.id,
      address,
      args: args as readonly unknown[],
      blockNumber,
      blockTag,
      chainId,
      functionName,
      gas,
      gasPrice,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      scopeKey,
      walletClientAddress: walletClient.value?.account.address,
      value,
    } as QueryKeyArgs & QueryKeyConfig),
    queryFn({
      // TODO: Remove cast and still support `Narrow<TAbi>`
      abi: unref(abi) as Abi,
      walletClient: unref(walletClient),
    }),
    {
      cacheTime,
      enabled: computed(
        () =>
          !!(
            unref(enabled) &&
            unref(abi) &&
            unref(address) &&
            unref(functionName) &&
            unref(walletClient)
          ),
      ),
      staleTime,
      suspense,
      onError,
      onSettled,
      onSuccess,
    },
  )

  const data = reactive({
    chainId,
    mode: 'prepared',
    request: undefined,
    result: undefined,
  })

  watchEffect(() => {
    updateState(data, prepareContractWriteQuery.data.value || {})
  })

  return Object.assign(prepareContractWriteQuery, {
    config: {
      ...toRefs(data),
    } as unknown as PrepareWriteContractResult, // TODO: fix type
  })
}
