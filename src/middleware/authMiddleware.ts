import { auth } from 'express-oauth2-jwt-bearer';

const AUDIENCE = process.env.AUDIENCE;
const ISSUER_BASE_URL = process.env.AUTH0_DOMAIN;


// Authorization middleware. When used, the Access Token must
// exist and be verified against the Auth0 JSON Web Key Set.

const checkJwt = auth({
  audience: AUDIENCE,
  issuerBaseURL: ISSUER_BASE_URL,
});

export { checkJwt };
