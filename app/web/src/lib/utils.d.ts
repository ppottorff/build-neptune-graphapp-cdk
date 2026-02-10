import { type ClassValue } from "clsx";
export declare function cn(...inputs: ClassValue[]): any;
export declare const Icons: {
    spinner: any;
};
export declare const queryGetProfile: (name: string, value: string) => Promise<GraphQLResult<GetProfileQuery>>;
export declare const queryGetRelationName: (name: string, value: string) => Promise<GraphQLResult<GetRelationNameQuery>>;
export declare const queryGetGraph: (value: string) => Promise<GraphQLResult<GetGraphQuery>>;
