import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { map } from 'rxjs/operators';

  export interface Response<T> {
    status: string;
    data: T;
  }

  @Injectable()
  export class TransformInterceptor<T>
    implements NestInterceptor<T, Response<T>>
  {
    intercept(
      context: ExecutionContext,
      next: CallHandler
    ): Observable<Response<T>> {
      return next.handle().pipe(
        map((data = {}) => {
          return data;
          // the below code moves the response into data whose content is content is either object or array of objects
          // return {
          // success: data?.success ?? true,
          // ...(data.message
          //   ? { message: data.message }
          //   : typeof data === 'string'
          //   ? { message: data }
          //   : data)
          // };
        })
      );
    }
  }