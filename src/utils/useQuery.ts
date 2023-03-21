import { useQuery as useBaseQuery } from 'vue-query'
import { WagmiQueryClientKey as queryClientKey } from '../create'

import type { ToRefs, UnwrapRef } from 'vue-demi'
import type {
  QueryKey,
  QueryFunction,
  UseQueryOptions,
  QueryObserverResult,
  DefinedQueryObserverResult,
  UseQueryReturnType as UQRT
} from 'vue-query'

type UseQueryReturnType<TData, TError> = Omit<
  UQRT<TData, TError>,
  "refetch" | "remove"
> & {
  refetch: QueryObserverResult<TData, TError>["refetch"];
  remove: QueryObserverResult<TData, TError>["remove"];
}

type UseQueryDefinedReturnType<TData, TError> = Omit<
  ToRefs<Readonly<DefinedQueryObserverResult<TData, TError>>>,
  "refetch" | "remove"
> & {
  suspense: () => Promise<QueryObserverResult<TData, TError>>;
  refetch: QueryObserverResult<TData, TError>["refetch"];
  remove: QueryObserverResult<TData, TError>["remove"];
}

export function useQuery<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
> (
  queryKey: TQueryKey,
  queryFn: QueryFunction<TQueryFnData, UnwrapRef<TQueryKey>>,
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
):
| UseQueryReturnType<TData, TError>
| UseQueryDefinedReturnType<TData, TError> {
  return useBaseQuery({
    queryKey,
    queryFn,
    queryClientKey,
    ...options
  })
}