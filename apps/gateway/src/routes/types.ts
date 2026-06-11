export type RouteAliasMap = Record<string, string>;

export type RouteDefinition = {
  method: string;
  path: string;
  action: string;
  layer: "REST";
};
