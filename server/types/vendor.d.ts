// Ambient declarations for untyped JS dependencies (no bundled @types packages).
declare module 'qrcode' {
  export function toDataURL(text: string): Promise<string>;
  export function toString(text: string): Promise<string>;
}

declare module 'speakeasy' {
  export interface KeyObject {
    base32: string;
    hex: string;
    ascii: string;
    otpauth_url: string;
  }

  export interface GenerateSecretOptions {
    name?: string;
    issuer?: string;
    digits?: number;
  }

  export interface OtpAuthOptions {
    secret: string;
    label?: string;
    name?: string;
    issuer?: string;
    digits?: number;
    period?: number;
    algorithm?: string;
  }

  export interface TotpOptions {
    secret: string;
    encoding?: string;
    step?: number;
    digits?: number;
    window?: number;
  }

  export interface TotpApi {
    generate(options: TotpOptions): string;
    verify(options: TotpOptions & { token: string }): boolean;
  }

  const speakeasy: {
    generateSecret(options?: GenerateSecretOptions): KeyObject;
    otpauthURL(options: OtpAuthOptions): string;
    totp: TotpApi;
  };

  export default speakeasy;
}
