import admin from 'firebase-admin'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { log } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

/**
 * Firebase Admin SDK 초기화
 */
export function initializeFirebase() {
  try {
    // 이미 초기화되어 있으면 스킵
    if (admin.apps.length > 0) {
      log.info('Firebase가 이미 초기화되어 있습니다.')
      return admin.firestore()
    }

    // Service Account 파일 경로 확인
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : path.join(__dirname, '../../serviceAccount.json')

    // Service Account 파일이 있으면 사용
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      })
      
      log.info('✅ Firebase Admin SDK 초기화 완료 (Service Account 파일 사용)')
      return admin.firestore()
    }

    // 환경 변수로부터 초기화
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        clientId: process.env.FIREBASE_CLIENT_ID,
        authUri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
        tokenUri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
        authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
        clientX509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      })

      log.info('✅ Firebase Admin SDK 초기화 완료 (환경 변수 사용)')
      return admin.firestore()
    }

    // 초기화 실패
    throw new Error('Firebase 설정을 찾을 수 없습니다. serviceAccount.json 파일 또는 환경 변수를 설정하세요.')
  } catch (error) {
    log.error('❌ Firebase 초기화 실패:', {
      error: error.message,
      stack: error.stack
    })
    throw error
  }
}

/**
 * Firestore 인스턴스 가져오기
 */
export function getFirestore() {
  if (admin.apps.length === 0) {
    return initializeFirebase()
  }
  return admin.firestore()
}

export default admin

