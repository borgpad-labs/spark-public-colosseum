import { jsonResponse, reportError } from "../cfPagesFunctionsUtils"
import { isAdminReturnValue, checkAdminAuthorization } from "../../services/authService"
import { AdminAuthFields } from "../../../shared/models"
import { z } from "zod"

type ENV = {
  DB: D1Database
  ADMIN_ADDRESSES: string
  R2_BUCKET_NAME: string
  BUCKET?: R2Bucket  // Make BUCKET optional
  R2?: R2Bucket      // Add R2 binding as optional
}

// Create an auth schema as it's not exported from models
const authSchema = z.object({
  address: z.string(),
  message: z.string(),
  signature: z.array(z.number())
})

type UploadOnR2Request = {
  auth: AdminAuthFields
  projectId: string
  fileData: string  // Base64 encoded file data
  fileName: string
  contentType: string
  folder?: string  // Optional folder path within the project directory
  cluster?: "mainnet" | "devnet"  // Add cluster parameter
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const db = ctx.env.DB

  try {
    // Print available environment bindings for debugging
    console.log("Available environment bindings:", Object.keys(ctx.env));
    
    // Parse request
    const request = await ctx.request.json() as UploadOnR2Request
    const { auth, projectId, fileData, fileName, contentType, folder = 'nft-metadata', cluster = 'mainnet' } = request

    console.log(`Attempting to upload file: ${fileName} to folder: ${projectId}/${folder}, cluster: ${cluster}`);

    // Validate request
    if (!projectId || !auth || !fileData || !fileName || !contentType) {
      return jsonResponse({
        message: 'Missing required fields: projectId, auth, fileData, fileName, or contentType'
      }, 400)
    }

    // Parse and validate auth data
    const { error, data } = authSchema.safeParse(auth)
    if (error) {
      return jsonResponse({
        message: 'Invalid auth data format'
      }, 400)
    }

    // Check if user is admin using the auth service
    const authResult: isAdminReturnValue = checkAdminAuthorization({ 
      ctx, 
      auth: data as AdminAuthFields 
    })
    
    if (!authResult.isAdmin) {
      const { error: authError } = authResult as { error: { code: number; message: string }, isAdmin: false }
      await reportError(db, new Error(authError.message))
      return jsonResponse({ message: "Unauthorized! Only admins can upload files." }, authError.code)
    }

    // Decode base64 file data
    let fileBuffer: ArrayBuffer
    try {
      // Remove data URL prefix if present (e.g., "data:image/png;base64,")
      const base64Data = fileData.includes('base64,') 
        ? fileData.split('base64,')[1] 
        : fileData
        
      fileBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0)).buffer
      console.log(`Successfully decoded file data. Size: ${fileBuffer.byteLength} bytes`);
    } catch (error) {
      console.error("Error decoding base64 data:", error);
      return jsonResponse({
        message: 'Invalid base64 file data'
      }, 400)
    }

    // Prepare file path
    const filePath = `${projectId}/${folder}/${fileName}`
    console.log(`Target file path: ${filePath}`);
    
    // Try to get bucket from either BUCKET or R2 binding
    const bucket = ctx.env.BUCKET || ctx.env.R2;
    
    // Check if any bucket is available
    if (!bucket) {
      console.warn("No R2 bucket binding available (tried both BUCKET and R2)");
      return jsonResponse({
        message: 'No R2 bucket binding available in the environment',
        success: false
      }, 500)
    }
    
    try {
      // Upload file to R2 using the available bucket binding
      await bucket.put(filePath, fileBuffer, {
        httpMetadata: {
          contentType: contentType
        }
      });
      console.log("File uploaded successfully to R2 bucket!");
    } catch (error) {
      console.error("Error during R2 put operation:", error);
      throw new Error(`R2 upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Determine the correct domain based on the provided cluster parameter
    const bucketDomain = cluster === "devnet" ? 'files.staging.borgpad.com' : 'files.borgpad.com';
    const publicUrl = `https://${bucketDomain}/${filePath}`;
    console.log(`File URL: ${publicUrl}`);

    return jsonResponse({
      message: 'File uploaded successfully',
      publicUrl: publicUrl
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  } catch (e) {
    await reportError(db, e)
    console.error("Error uploading file to R2:", e)
    return jsonResponse({
      message: `Error uploading file to R2: ${e instanceof Error ? e.message : String(e)}`
    }, 500)
  }
}

// Handle OPTIONS request for CORS
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  })
} 