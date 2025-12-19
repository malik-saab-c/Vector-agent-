import { GoogleGenAI } from "@google/genai";
import { VectorImage, ImageMetadata } from "../types";

// DIRECT API KEY INTEGRATION (No .env required for Vercel deployment)
const API_KEY = "AIzaSyBc-iCQUKPmpgw1GiWpVV8X0s0lsj_j3vg";
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- CONVERT TO JPG (ADOBE STOCK COMPLIANT) ---
export const convertToJPG = async (blob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      // ADOBE STOCK REQUIREMENT: 
      // Preview must be at least 15 MP (Megapixels).
      // We target ~5000px on the long side to comfortably exceed this (5000x5000 = 25MP).
      const TARGET_DIM = 5000;
      
      let width = img.width;
      let height = img.height;
      
      // Calculate scale factor to reach target dimension
      const scale = TARGET_DIM / Math.max(width, height);
      
      // Only upscale if strictly necessary (prevent downscaling)
      if (scale > 1) {
          width = Math.floor(width * scale);
          height = Math.floor(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      
      // Use high-quality interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill white background (Vectors must not have transparency in JPG preview)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw image scaled
      ctx.drawImage(img, 0, 0, width, height);
      
      // EXPORT AT MAX QUALITY (1.0) to ensure File Size > 1MB
      canvas.toBlob((jpgBlob) => {
        if (jpgBlob) resolve(jpgBlob);
        else reject(new Error("JPG conversion failed"));
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 1.0);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for JPG conversion"));
    };
    img.src = url;
  });
};

// --- REAL EPS GENERATOR (OPTIMIZED) ---
export const generateRealEPS = async (blob: Blob): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const width = img.width;
      const height = img.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, width, height).data;

      // Start EPS Header
      let eps = `%!PS-Adobe-3.0 EPSF-3.0\n`;
      eps += `%%BoundingBox: 0 0 ${width} ${height}\n`;
      eps += `%%Title: SpectraGAN Vector\n`;
      eps += `%%Creator: SpectraGAN AI Agent\n`;
      eps += `%%Pages: 1\n`;
      eps += `%%EndComments\n`;
      eps += `%%Page: 1 1\n`;
      eps += `/DeviceRGB setcolorspace\n`;
      eps += `${width} ${height} scale\n`;
      eps += `${width} ${height} 8 [${width} 0 0 -${height} 0 ${height}]\n`;
      eps += `{currentfile 3 ${width} mul string readhexstring pop} false 3 colorimage\n`;

      // Convert RGB pixels to Hex using Array.join for better memory management
      const hexTable = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
      const hexChunks: string[] = [];
      let currentChunk = "";
      
      for (let i = 0; i < data.length; i += 4) {
        // R, G, B
        currentChunk += hexTable[data[i]] + hexTable[data[i+1]] + hexTable[data[i+2]];
        
        // Push chunks to avoid massive string concatenation issues
        if (currentChunk.length > 8000) { 
           hexChunks.push(currentChunk);
           currentChunk = "";
        }
      }
      if (currentChunk.length > 0) hexChunks.push(currentChunk);
      
      eps += hexChunks.join("\n") + "\n";
      eps += `%%EOF`;

      const epsBlob = new Blob([eps], { type: 'application/postscript' });
      URL.revokeObjectURL(url);
      resolve(epsBlob);
    };
    img.onerror = () => reject(new Error("Failed to load image for EPS conversion"));
    img.src = url;
  });
};

export const generateVectorCandidates = async (userPrompt: string, referenceImage?: string): Promise<VectorImage[]> => {
  const isImageToVector = !!referenceImage;
  let promptToUse = userPrompt;

  // CASE 1: RANDOM MARKET TREND MODE (No prompt, No Image)
  // We skip complex trend analysis for single image generation and just pick a robust default if empty
  if (!userPrompt.trim() && !isImageToVector) {
     promptToUse = "Geometric minimalist wolf logo, vector style, white background";
  }

  try {
      let fullPrompt = "";

      if (isImageToVector) {
          fullPrompt = `
            TASK: REDRAW THIS IMAGE AS A CLEAN VECTOR.
            Subject: ${promptToUse || "The object in the image"}.
            
            STRICT VISUAL RULES:
            - CONVERT to high-end Vector Graphics (SVG style).
            - NO photorealism. NO blurred edges. NO jpg artifacts.
            - CLEAN LINES: Use bold, confident strokes.
            - FLAT COLORS: Limit color palette to professional vector swatches.
            - STYLE: Minimalist, Flat Design, Iconography.
            - BACKGROUND: Pure White (#FFFFFF).
          `;
      } else {
          fullPrompt = `
            GENERATE A BEST-SELLING ADOBE STOCK VECTOR ILLUSTRATION.
            SUBJECT: ${promptToUse}
            
            STYLE GUIDE (STRICT):
            1. **TYPE:** Digital Vector Art / Screen Print / Decal.
            2. **QUALITY:** Masterpiece, 4k, Ultra-Detailed.
            3. **LINEWORK:** Clean, sharp, unpixelated lines. Perfect geometry.
            4. **AESTHETIC:** Trending on Dribbble, Behance, and Shutterstock.
            5. **COMPOSITION:** Isolated subject on WHITE background. centered.
            
            NEGATIVE PROMPT (AVOID):
            - No gradients, no shading, no 3D render, no blur.
            - No text, no watermarks, no signatures.
            - No messy sketches, no unfinished lines.
          `;
      }

      const parts: any[] = [];
      if (referenceImage) {
        const base64Data = referenceImage.includes(',') ? referenceImage.split(',')[1] : referenceImage;
        parts.push({
            inlineData: {
                mimeType: "image/png", 
                data: base64Data
            }
        });
      }
      parts.push({ text: fullPrompt });

      // Generate ONLY ONE image using gemini-2.5-flash-image
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', 
        contents: { parts },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          // Return array with single item
          return [{
            id: `img_${Date.now()}_0`,
            data: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
            prompt: promptToUse
          }];
        }
      }
      return [];
    } catch (e) {
      console.error(`Generation failed`, e);
      return [];
    }
};

// --- METADATA GENERATION USING POLLINATIONS AI (PROXY) ---
export const generateImageMetadata = async (base64Data: string, mimeType: string): Promise<ImageMetadata> => {
  const instruction = `
    Analyze this vector illustration for a Stock Photography site.
    1. Title: Create 5 catchy, SEO-optimized titles (e.g., "Minimalist Geometric Wolf Logo - Vector Isolated").
    2. Keywords: List 45+ comma-separated keywords sorted by relevance. Include style keywords like "vector", "flat", "illustration", "isolated".
    
    IMPORTANT: Return ONLY valid JSON in the following format, with no markdown code fences:
    {
      "titles": ["Title 1", "Title 2", ...],
      "keywords": ["keyword1", "keyword2", ...]
    }
  `;

  // Construct Data URL for Pollinations
  const imageUrl = `data:${mimeType};base64,${base64Data}`;

  try {
    const response = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: instruction },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Pollinations API Error: ${response.status}`);
    }

    const data = await response.json();
    let text = data.choices?.[0]?.message?.content || "{}";
    
    // Clean up markdown if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    return {
        titles: parsed.titles || ["Vector Illustration"],
        keywords: parsed.keywords || ["vector", "illustration"]
    };

  } catch (e) {
    console.error("Metadata generation failed via Pollinations", e);
    // Fallback
    return { 
        titles: ["Vector Illustration - High Quality Stock Image", "Isolated Vector Art Object", "Digital Illustration Design Element", "Professional Graphic Asset", "Creative Vector Icon"], 
        keywords: ["vector", "illustration", "graphic", "design", "art", "isolated", "white background", "stock", "commercial", "icon", "symbol", "modern", "flat", "clean", "shape", "creative", "element", "digital", "print", "web", "svg", "eps", "artwork", "drawing", "sketch", "lineart", "silhouette", "black", "white", "style", "concept", "abstract", "geometric", "nature", "technology", "business", "decoration", "pattern", "badge", "label", "logo", "sign", "template", "poster", "card"] 
    };
  }
};

export const upscaleImageService = async (base64Data: string, mimeType: string): Promise<Blob> => {
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: mimeType });
  const file = new File([blob], "input.png", { type: mimeType });

  const formData = new FormData();
  formData.append("image", file);
  formData.append("mode", "x2");

  const response = await fetch("https://AKWBW-UPTHEIMAGE.hf.space/upscale", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw new Error("Upscaling service failed");
  }

  return await response.blob();
};