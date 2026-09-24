export declare function isValidEmail(email: string): boolean;
export declare function isValidUUID(value: string): boolean;
export declare function isPositiveNumber(value: number, allowZero?: boolean): boolean;
export declare function isNonEmptyString(value: string, maxLength?: number): boolean;
export declare function isInRange(value: number, min: number, max: number): boolean;
export declare function isValidCode(code: string, maxLength?: number): boolean;
export interface PasswordValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validatePassword(password: string): PasswordValidationResult;
export declare function validatePagination(page: number, limit: number): {
    page: number;
    limit: number;
};
export declare function sanitizeString(value: string): string;
export declare function isValidDocumentStatus(status: string): boolean;
//# sourceMappingURL=index.d.ts.map