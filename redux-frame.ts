export type Action<T extends string, P> = {
  type: T;
  payload: P;
};

export function actionCreator<T extends string, D, P>(
  type: T,
  wrapper: (data: D) => P,
): (data: D) => Action<T, P> {
  const creator = (data: D) => ({
    type,
    payload: wrapper(data),
  });
  creator.toString = () => type;
  return creator;
}

export type ActionCreatorMaker<T extends string, D, P> = (
  type: T,
  creator: (data: D) => P,
) => (data: D) => Action<T, P>;

type ActionCreator<T extends string, D, P> = ReturnType<
  ActionCreatorMaker<T, D, P>
>;

export type ArgType<T> = T extends (arg: infer A) => any ? A : never;

export type ActionCreatorsMap<
  M extends { [type: string]: (data: any) => any }
> = { [T in keyof M]: ActionCreator<T, ArgType<M[T]>, ReturnType<M[T]>> };

export type ActionCreatorsMapNS<
  M extends { [type: string]: (data: any) => any }
> = { [T in keyof M]: ActionCreator<string, ArgType<M[T]>, ReturnType<M[T]>> };

export function actionCreatorsMap<
  M extends { [type: string]: (data: any) => any }
>(creators: M): ActionCreatorsMap<M>;

export function actionCreatorsMap<
  M extends { [type: string]: (data: any) => any }
>(creators: M, namespace: string): ActionCreatorsMapNS<M>;

export function actionCreatorsMap<
  M extends { [type: string]: (data: any) => any }
>(creators: M, namespace?: string) {
  const creatorsMap = {} as ActionCreatorsMap<M> | ActionCreatorsMapNS<M>;
  for (const actionType of Object.keys(creators)) {
    const type = namespace ? `${namespace}/${actionType}` : actionType;
    creatorsMap[actionType] = actionCreator(type, creators[actionType]);
  }
  return creatorsMap;
}

export function namespacedCreators(namespace: string) {
  return {
    actionCreator<T extends string, D, P>(type: T, wrapper: (data: D) => P) {
      return actionCreator(`${namespace}/${type}`, wrapper);
    },

    actionCreatorsMap<M extends { [type: string]: (data: any) => any }>(
      creators: M,
    ) {
      return actionCreatorsMap(creators, namespace);
    },
  };
}

type ActionCreatorGeneric = ActionCreator<string, any, any>;

type Payload<C extends ActionCreatorGeneric> = ReturnType<C>['payload'];

type Reducer<C extends ActionCreatorGeneric, S = any> = (
  state: S,
  payload: Payload<C>,
) => S;

type ReducersMap<M extends ActionCreatorsMap<any>, S = any> = {
  [T in keyof M]: Reducer<M[T], S>
};

type Type<C extends ActionCreatorGeneric> = ReturnType<C>['type'];

export function makeReducer<M extends ActionCreatorsMap<any>, S>(
  creatorsMap: M,
  initialState: S,
  reducersMap: ReducersMap<M, S>,
) {
  type Creator = M[keyof M];
  type T = Type<Creator>;
  type P = Payload<Creator>;

  const namespaceMap = {} as { [NSType in T]: keyof M };
  for (const [nonNSType, creator] of Object.entries(creatorsMap)) {
    namespaceMap[creator.toString() as T] = nonNSType;
  }

  return (state: S = initialState, action: Action<T, P>) => {
    const reducer = reducersMap[namespaceMap[action.type]];
    return reducer ? reducer(state, action.payload) : state;
  };
}
