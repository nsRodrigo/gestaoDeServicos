const STORAGE_PREFIX = 'biometric_cred_'

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let str = ''
  for (const b of bytes) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBuffer(base64url: string) {
  const padded = base64url.padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=')
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const str = atob(base64)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i)
  return bytes.buffer
}

function randomChallenge() {
  return crypto.getRandomValues(new Uint8Array(32))
}

export function isBiometricSupported() {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  )
}

export async function isBiometricAvailableOnDevice() {
  if (!isBiometricSupported()) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function hasBiometricEnabled(userId: string) {
  return !!localStorage.getItem(STORAGE_PREFIX + userId)
}

// Registra a biometria da plataforma (digital ou reconhecimento facial) como trava local
// deste dispositivo. Não substitui a senha nem viaja para o servidor: só serve para
// destravar, neste navegador, a sessão do Supabase que já está salva.
export async function enableBiometric(userId: string, email: string, displayName: string) {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: 'Barbearia Profissional' },
      user: {
        id: new TextEncoder().encode(userId),
        name: email,
        displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null

  if (!credential) throw new Error('Não foi possível registrar a biometria.')

  localStorage.setItem(STORAGE_PREFIX + userId, bufferToBase64Url(credential.rawId))
}

export function disableBiometric(userId: string) {
  localStorage.removeItem(STORAGE_PREFIX + userId)
}

export async function verifyBiometric(userId: string) {
  const storedId = localStorage.getItem(STORAGE_PREFIX + userId)
  if (!storedId) return false

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      allowCredentials: [
        {
          id: base64UrlToBuffer(storedId),
          type: 'public-key',
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  })

  return !!assertion
}
