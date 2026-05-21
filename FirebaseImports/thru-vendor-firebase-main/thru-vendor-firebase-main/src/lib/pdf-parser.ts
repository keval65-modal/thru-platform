// @ts-ignore
import pdfParse from 'pdf-parse'

export async function parsePdfText(buffer: Buffer): Promise<string> {
  try {
    console.log('[PDF Parser] Starting parse, buffer size:', buffer?.length || 0)
    
    if (!buffer || buffer.length === 0) {
      throw new Error('PDF buffer is empty or undefined')
    }

    if (typeof pdfParse !== 'function') {
      console.error('[PDF Parser] pdfParse is not a function, type:', typeof pdfParse)
      console.error('[PDF Parser] pdfParse keys:', Object.keys(pdfParse || {}))
      throw new Error('pdf-parse library not properly loaded')
    }

    const data = await pdfParse(buffer)
    console.log('[PDF Parser] Parse successful, text length:', data?.text?.length || 0)
    
    if (!data || !data.text) {
      throw new Error('PDF parsing returned no text content')
    }
    
    return data.text
  } catch (error) {
    console.error('[PDF Parser] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name
    })
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
