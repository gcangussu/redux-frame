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

export type ActionCreator<T extends string, D, P> = (data: D) => Action<T, P>;

export type WrappersMap = { [typeId: string]: (data: any) => any };

type ArgType<T> = T extends (arg: infer A) => any ? A : never;

export type ActionCreatorsMap<M extends WrappersMap> = {
  [T in Extract<keyof M, string>]: ActionCreator<
    T,
    ArgType<M[T]>,
    ReturnType<M[T]>
  >
};

export type ActionCreatorsMapNS<M extends WrappersMap> = {
  [T in Extract<keyof M, string>]: ActionCreator<
    string,
    ArgType<M[T]>,
    ReturnType<M[T]>
  >
};

export function actionCreatorsMap<M extends WrappersMap>(
  wrappers: M,
): ActionCreatorsMap<M>;

export function actionCreatorsMap<M extends WrappersMap>(
  wrappers: M,
  namespace: string,
): ActionCreatorsMapNS<M>;

export function actionCreatorsMap<M extends WrappersMap>(
  wrappers: M,
  namespace?: string,
) {
  const creatorsMap = {} as { [typeId: string]: ActionCreatorGeneric };
  for (const typeId of Object.keys(wrappers)) {
    const type = namespace ? `${namespace}/${typeId}` : typeId;
    creatorsMap[typeId] = actionCreator(type, wrappers[typeId]);
  }
  return creatorsMap;
}

type ActionCreatorGeneric = ActionCreator<string, any, any>;

type Payload<C extends ActionCreatorGeneric> = ReturnType<C>['payload'];

export type Reducer<C extends ActionCreatorGeneric, S = any> = (
  state: S,
  payload: Payload<C>,
) => S;

type ActionCreatorsMapGeneric = ActionCreatorsMap<WrappersMap>;

export type ReducersMap<M extends ActionCreatorsMapGeneric, S = any> = {
  [T in keyof M]: Reducer<M[T], S>
};

type Type<C extends ActionCreatorGeneric> = ReturnType<C>['type'];

export function reducerCreator<M extends ActionCreatorsMapGeneric, S>(
  creatorsMap: M,
  initialState: S,
) {
  type Creator = M[keyof M];
  type T = Type<Creator>;
  type P = Payload<Creator>;

  return (reducersMap: ReducersMap<M, S>) => (
    state: S = initialState,
    action: Action<T | string, P>,
  ) => {
    const typeToReducerMap = {} as { [NSType in T]: Reducer<Creator, S> };
    for (const [typeId, creator] of Object.entries(creatorsMap)) {
      typeToReducerMap[creator.toString() as T] = reducersMap[typeId];
    }

    const reducer = typeToReducerMap[action.type];
    return reducer ? reducer(state, action.payload) : state;
  };
}
