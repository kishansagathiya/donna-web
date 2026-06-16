interface AppleAuthorization {
  id_token: string;
  code: string;
  state?: string;
}

interface AppleUserName {
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

interface AppleSignInResponse {
  authorization: AppleAuthorization;
  user?: {
    email?: string;
    name?: AppleUserName;
  };
}

interface AppleAuth {
  init(config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
    state?: string;
    nonce?: string;
  }): void;
  signIn(): Promise<AppleSignInResponse>;
}

interface AppleIDGlobal {
  auth: AppleAuth;
}

interface Window {
  AppleID?: AppleIDGlobal;
}
