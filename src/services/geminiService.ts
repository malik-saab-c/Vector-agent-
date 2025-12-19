import { GoogleGenAI, Type, Schema } from "@google/genai";
import { FileSystem, Message, Attachment } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Complex schema to support the GenBuilder Ultra workflow
const genBuilderSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    buildSteps: {
      type: Type.ARRAY,
      description: "A chronological list of actions being taken, e.g., 'Creating project structure...', 'Generating src/components/Hero.tsx...'. Used for the progress animation.",
      items: { type: Type.STRING }
    },
    files: {
      type: Type.ARRAY,
      description: "The actual code files to be generated or updated.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "The full path of the file (e.g., src/App.tsx)" },
          content: { type: Type.STRING, description: "The full code content of the file" },
          language: { type: Type.STRING, description: "The programming language (typescript, javascript, html, css)" },
        },
        required: ["name", "content", "language"],
      },
    },
    previewSnapshot: {
      type: Type.STRING,
      description: "A detailed visual description of what the resulting preview looks like (e.g., 'Dark mode dashboard with a glassmorphism sidebar, neon chart accents, and Inter typography')."
    },
    summary: { 
      type: Type.STRING, 
      description: "A short, friendly message to the user asking for the next step (e.g., 'I've built the landing page. Want to add a pricing section?')." 
    },
  },
  required: ["buildSteps", "files", "previewSnapshot", "summary"],
};

export const generateProjectCode = async (
  prompt: string, 
  currentFiles: FileSystem, 
  history: Message[],
  attachment?: Attachment
) => {
  const model = "gemini-3-pro-preview";

  // Construct context from currentFiles
  // Only send text files, skip binary/base64 to save tokens and avoid confusion unless critical
  const fileContext = Object.values(currentFiles)
    .filter((f: any) => !f.content.startsWith('data:')) 
    .map((f: any) => `File: ${f.name}\n\`\`\`${f.language}\n${f.content}\n\`\`\``)
    .join("\n\n");

  const systemInstruction = `
    You are **GenBuilder Ultra**, an advanced AI App Builder similar to Lovable.dev.
    
    ### CORE IDENTITY
    - You are NOT a chatbot. You are an **engine** that builds software.
    - You never show raw code in the chat. You show **progress** and **file lists**.
    - You maintain "Project Memory": you remember design choices and user preferences.
    - You support "Zero-Code Mode": The user sees the app, not the code, unless explicitly asked.

    ### CRITICAL: PREVIEW STRATEGY
    1. **Scenario A: New React Project**
       - Generate 'preview.html' (Self-Contained Bundle).
       - Use <script type="text/babel">.
       - NO imports/exports in 'preview.html'.
       - Copy component code into 'preview.html'.
    
    2. **Scenario B: Editing an Imported Website (index.html present)**
       - If you see an 'index.html' in the file list, DO NOT generate 'preview.html'.
       - EDIT the 'index.html', 'style.css', or 'script.js' directly.
       - Maintain the existing structure.
       - The preview engine automatically bundles them.
    
    ### FILE GENERATION RULES
    - If starting from scratch: Generate 'preview.html' + 'src/App.tsx' + 'src/components/*'.
    - If editing existing: Update only the relevant files.
    
    ### UI/UX STANDARDS
    - Use **Tailwind CSS** for everything (add CDN if missing in index.html).
    - Design style: Modern, Clean, Professional (Stripe/Vercel/Linear aesthetic).
    - Default to dark mode (zinc-950 background) unless asked otherwise.
    - Use 'Inter' font.
    - Glassmorphism and subtle gradients are encouraged for "high quality".
    - If the user provides an IMAGE/SCREENSHOT, you must REPLICATE it pixel-perfectly using Tailwind.

    ### RESPONSE FORMAT
    You must output JSON matching the schema:
    1. **buildSteps**: A list of strings simulating the build process.
    2. **files**: The array of file objects.
    3. **previewSnapshot**: A vivid description of what the user sees in the preview pane.
    4. **summary**: A brief, helpful text asking what to do next.

    ### EDITING RULES
    - **Incremental**: Only generate files that change.
    - **Consistency**: Keep the same theme/layout unless asked to change.
  `;

  // Build the parts array for the user message
  const parts: any[] = [];

  // Add file attachment if present
  if (attachment) {
    // Check if it's an image or PDF (supported by Vision/Multimodal inlineData)
    // Note: Gemini supports: image/png, image/jpeg, image/webp, image/heic, image/heif, application/pdf
    const isVisual = attachment.mimeType.startsWith('image/') || attachment.mimeType === 'application/pdf';

    if (isVisual) {
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data
        }
      });
      parts.push({
        text: `[User uploaded a visual file: ${attachment.name}]. Please analyze the design/layout in this image/document and replicate it.`
      });
    } else if (attachment.mimeType === 'application/zip-project-context') {
      // Handle the ZIP Context text blob
       try {
        const binaryString = atob(attachment.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const textContent = new TextDecoder().decode(bytes);

        parts.push({
          text: `[User uploaded a project ZIP: ${attachment.name}]\nThis is the content of the files in the zip. Use this to understand the current project structure and files.\n\n${textContent}\n\nIMPORTANT: Use this code as the base for any changes.`
        });
      } catch (e) {
        console.warn("Could not decode zip context", e);
      }
    } else {
      // Assume text/code file - decode and add as text context
      try {
        // Robust decode for unicode (though standard atob covers most code files)
        const binaryString = atob(attachment.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const textContent = new TextDecoder().decode(bytes);

        parts.push({
          text: `[User uploaded a code/text file: ${attachment.name}]\nFile Content:\n\`\`\`\n${textContent}\n\`\`\`\nPlease use this code or content as context for the build.`
        });
      } catch (e) {
        // Fallback or ignore binary files that aren't images
        console.warn("Could not decode file text", e);
        parts.push({
          text: `[User uploaded a file: ${attachment.name}] (Content could not be decoded, possibly binary).`
        });
      }
    }
  }

  const userContent = `
    Current File System Context (Virtual):
    ${Object.keys(currentFiles).length > 0 ? fileContext : "Empty Project"}

    Chat History:
    ${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

    User Request: ${prompt}
  `;
  
  parts.push({ text: userContent });

  try {
    const result = await genAI.models.generateContent({
      model,
      contents: { parts }, // Pass the multimodal parts array
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: genBuilderSchema,
      },
    });

    const parsed = JSON.parse(result.text || "{}");
    
    // Fallback if parsing fails or schema is violated
    if (!parsed.files) parsed.files = [];
    if (!parsed.buildSteps) parsed.buildSteps = ["Processing..."];
    if (!parsed.previewSnapshot) parsed.previewSnapshot = "Preview updated.";
    
    return parsed;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to generate code.");
  }
};