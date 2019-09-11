import "reflect-metadata";
import { Injectable, Injector, StaticProvider } from "@angular/core";
import { ClassType } from "class-transformer/ClassTransformer";

@Injectable({
  providedIn: "root"
})
export class ServiceFactoryService {
  constructor(private injector: Injector) {}

  getService<T>(
    cls: ClassType<T>,
    injections: StaticProvider[],
    deps: any[]
  ): T {
    const injector: Injector = Injector.create({
      providers: [
        ...injections,
        {
          provide: cls,
          deps: deps
        }
      ],
      parent: this.injector
    });

    return injector.get(cls);
  }

  // TODO: uncomment when Ivy finishes implementing emitting decorators metadata on AOT
  // private getDeps<T>(cls: ClassType<T>, injections: StaticProvider[]): any[] {
  //   const deps = Reflect.getMetadata(Reflect.getMetadataKeys(cls)[0], cls);
  //   injections.forEach((_, index) => {
  //     deps[index] = (injections[index] as any).provide;
  //   });
  //   return deps;
  // }
}
