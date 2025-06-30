export interface IResponse {
  message: string;
  details?: object | Array<object>;
  extra?: object;
}
