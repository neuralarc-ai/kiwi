import Tesseract from 'tesseract.js';
import sharp from 'sharp';

/**
 * Extract text from image using OCR
 */
export const extractTextFromImage = async (imageBuffer, imageType = 'image') => {
  try {
    // Convert PDF to image if needed, or process image directly
    let processedBuffer = imageBuffer;
    
    if (imageType === 'application/pdf') {
      // For PDFs, we'd need pdf-lib or similar, but for now we'll handle images
      // In production, use a proper PDF to image converter
      throw new Error('PDF OCR not yet implemented. Please upload image files.');
    }

    // Validate buffer
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Empty image buffer provided');
    }

    // Preprocess image for better OCR results
    try {
      processedBuffer = await sharp(imageBuffer)
        .greyscale()
        .normalize()
        .sharpen()
        .toBuffer();
    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError);
      // If Sharp fails, try using original buffer
      console.log('⚠️ Falling back to original image buffer');
      processedBuffer = imageBuffer;
    }

    // Perform OCR with timeout protection
    const ocrPromise = Tesseract.recognize(processedBuffer, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Add timeout (60 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OCR processing timeout (60s)')), 60000);
    });

    const { data: { text } } = await Promise.race([ocrPromise, timeoutPromise]);

    return text.trim();
  } catch (error) {
    console.error('OCR Error:', error);
    console.error('OCR Error stack:', error.stack);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
};

/**
 * Extract name from PAN card text
 */
export const extractPANName = (panText) => {
  if (!panText) return null;
  
  const upperText = panText.toUpperCase();
  
  // PAN name patterns - name usually appears before or after PAN number
  const namePatterns = [
    /(?:NAME|NAME OF|NAME OF HOLDER|INCOME TAX DEPARTMENT)[\s:]*([A-Z\s]{3,50})/i,
    /([A-Z\s]{3,50})(?:\s+[A-Z]{5}[0-9]{4}[A-Z]{1})/i, // Name before PAN
    /([A-Z]{5}[0-9]{4}[A-Z]{1})\s+([A-Z\s]{3,50})/i, // Name after PAN
  ];
  
  for (const pattern of namePatterns) {
    const match = panText.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim().replace(/\s+/g, ' ');
      if (name.length >= 3 && name.length <= 50 && !name.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
        return name;
      }
    }
  }
  
  return null;
};

/**
 * Extract DOB from PAN card text
 */
export const extractPANDOB = (panText) => {
  if (!panText) return null;
  
  // Look for date patterns: DD/MM/YYYY, DD-MM-YYYY
  const datePatterns = [
    /(?:DOB|DATE OF BIRTH|BIRTH DATE)[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,
  ];
  
  for (const pattern of datePatterns) {
    const match = panText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Validate PAN format: ABCDE1234F (5 letters, 4 digits, 1 letter)
 */
export const validatePAN = (panText) => {
  if (!panText) return { isValid: false, panNumber: null, name: null, dob: null };
  
  // Extract PAN from text (format: ABCDE1234F)
  const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/g;
  const matches = panText.match(panRegex);
  
  const panNumber = matches && matches.length > 0 ? matches[0].toUpperCase() : null;
  const name = extractPANName(panText);
  const dob = extractPANDOB(panText);
  
  return { 
    isValid: panNumber !== null, 
    panNumber,
    name,
    dob
  };
};

/**
 * Extract name from Aadhaar card text
 */
export const extractAadhaarName = (aadhaarText) => {
  if (!aadhaarText) return null;
  
  const upperText = aadhaarText.toUpperCase();
  
  // Aadhaar name patterns
  const namePatterns = [
    /(?:NAME|NAME OF|NAME OF HOLDER)[\s:]*([A-Z\s]{3,50})/i,
    /([A-Z\s]{3,50})(?:\s+\d{4}\s+\d{4}\s+\d{4})/i, // Name before Aadhaar number
    /^([A-Z\s]{3,50})(?:\s+[MF])/i, // Name before gender
  ];
  
  for (const pattern of namePatterns) {
    const match = aadhaarText.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim().replace(/\s+/g, ' ');
      if (name.length >= 3 && name.length <= 50) {
        return name;
      }
    }
  }
  
  return null;
};

/**
 * Extract DOB from Aadhaar card text
 */
export const extractAadhaarDOB = (aadhaarText) => {
  if (!aadhaarText) return null;
  
  // Look for date patterns: DD/MM/YYYY, DD-MM-YYYY
  const datePatterns = [
    /(?:DOB|DATE OF BIRTH|BIRTH DATE)[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,
  ];
  
  for (const pattern of datePatterns) {
    const match = aadhaarText.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
};

/**
 * Validate Aadhar format: 12 digits
 */
export const validateAadhar = (aadharText) => {
  if (!aadharText) return { isValid: false, aadharNumber: null, name: null, dob: null };
  
  // Extract Aadhar from text (12 digits, may have spaces or dashes)
  const aadharRegex = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
  const matches = aadharText.match(aadharRegex);
  
  const aadharNumber = matches && matches.length > 0 
    ? matches[0].replace(/[\s-]/g, '') 
    : null;
  
  const name = extractAadhaarName(aadharText);
  const dob = extractAadhaarDOB(aadharText);
  
  return { 
    isValid: aadharNumber && aadharNumber.length === 12, 
    aadharNumber,
    name,
    dob
  };
};

/**
 * Extract account holder name from bank details
 */
export const extractBankAccountHolderName = (text) => {
  if (!text) return null;
  
  const upperText = text.toUpperCase();
  
  // Bank account holder name patterns
  const namePatterns = [
    /(?:ACCOUNT HOLDER|ACCOUNT NAME|NAME OF ACCOUNT HOLDER|HOLDER NAME)[\s:]*([A-Z\s]{3,50})/i,
    /([A-Z\s]{3,50})(?:\s+ACCOUNT|ACCOUNT NO|A\/C)/i,
    /^([A-Z\s]{3,50})(?:\s+[A-Z]{4}0[A-Z0-9]{6})/i, // Name before IFSC
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim().replace(/\s+/g, ' ');
      if (name.length >= 3 && name.length <= 50) {
        return name;
      }
    }
  }
  
  return null;
};

/**
 * Extract bank details from text
 */
export const extractBankDetails = (text) => {
  if (!text) {
    return {
      accountNumber: null,
      bankName: null,
      ifscCode: null,
      accountHolderName: null,
      isValid: false
    };
  }

  const upperText = text.toUpperCase();
  
  // Extract IFSC code (format: ABCD0123456 - 4 letters, 1 digit, 5 alphanumeric)
  const ifscRegex = /[A-Z]{4}0[A-Z0-9]{6}/g;
  const ifscMatches = upperText.match(ifscRegex);
  const ifscCode = ifscMatches && ifscMatches.length > 0 ? ifscMatches[0] : null;

  // Extract account number (typically 9-18 digits)
  const accountRegex = /\b\d{9,18}\b/g;
  const accountMatches = text.match(accountRegex);
  const accountNumber = accountMatches && accountMatches.length > 0 
    ? accountMatches[accountMatches.length - 1] // Take the last match (usually the account number)
    : null;

  // Extract bank name (common Indian bank names)
  const bankNames = [
    'STATE BANK OF INDIA', 'SBI',
    'HDFC BANK', 'HDFC',
    'ICICI BANK', 'ICICI',
    'AXIS BANK', 'AXIS',
    'PUNJAB NATIONAL BANK', 'PNB',
    'BANK OF BARODA', 'BOB',
    'CANARA BANK',
    'UNION BANK OF INDIA',
    'INDIAN BANK',
    'INDIAN OVERSEAS BANK', 'IOB',
    'CENTRAL BANK OF INDIA',
    'BANK OF INDIA', 'BOI',
    'UNITED BANK OF INDIA',
    'ORIENTAL BANK OF COMMERCE', 'OBC',
    'CORPORATION BANK',
    'SYNDICATE BANK',
    'UCO BANK',
    'ANDHRA BANK',
    'VIJAYA BANK',
    'IDBI BANK',
    'YES BANK',
    'KOTAK MAHINDRA BANK', 'KOTAK',
    'INDUSIND BANK',
    'RBL BANK',
    'FEDERAL BANK',
    'SOUTH INDIAN BANK',
    'KARUR VYSYA BANK',
    'CITY UNION BANK',
    'DCB BANK',
    'DHANLAXMI BANK',
    'LAKSHMI VILAS BANK',
    'JANA SMALL FINANCE BANK',
    'EQUITAS SMALL FINANCE BANK',
    'AU SMALL FINANCE BANK',
    'ESAF SMALL FINANCE BANK',
    'UTKARSH SMALL FINANCE BANK',
    'NORTH EAST SMALL FINANCE BANK',
    'SURYODAY SMALL FINANCE BANK',
    'UJJIVAN SMALL FINANCE BANK',
    'FINCARE SMALL FINANCE BANK',
    'CAPITAL SMALL FINANCE BANK',
    'J&K BANK',
    'KASHMIR BANK'
  ];

  let bankName = null;
  for (const name of bankNames) {
    if (upperText.includes(name)) {
      bankName = name;
      break;
    }
  }

  // If no bank name found, try to extract from "BANK" keyword
  if (!bankName) {
    const bankMatch = upperText.match(/([A-Z\s]+BANK)/);
    if (bankMatch) {
      bankName = bankMatch[1].trim();
    }
  }

  const accountHolderName = extractBankAccountHolderName(text);

  const isValid = !!(accountNumber && ifscCode);

  return {
    accountNumber,
    bankName,
    ifscCode,
    accountHolderName,
    isValid
  };
};

/**
 * Process document with OCR and extract relevant information
 */
export const processDocumentOCR = async (fileBuffer, documentType, mimeType) => {
  let extractedText = '';
  try {
    console.log(`🔍 Starting OCR for ${documentType}...`);
    console.log(`📄 File buffer size: ${fileBuffer.length} bytes`);
    console.log(`📄 MIME type: ${mimeType}`);
    
    // Extract text from image - wrap in try-catch to handle OCR errors
    try {
      extractedText = await extractTextFromImage(fileBuffer, mimeType);
      console.log(`📄 Extracted text length: ${extractedText.length} characters`);
      if (extractedText.length > 0) {
        console.log(`📄 First 200 chars: ${extractedText.substring(0, 200)}`);
      }
    } catch (ocrError) {
      console.error(`❌ OCR extraction error:`, ocrError);
      // Return partial result - we might still be able to extract something
      extractedText = '';
    }
    
    let result = {
      verified: false,
      extractedData: {},
      rawText: extractedText
    };

    // Only process if we have extracted text
    if (extractedText && extractedText.length > 0) {
      try {
        switch (documentType) {
          case 'bank_details':
            const bankDetails = extractBankDetails(extractedText);
            result.extractedData = bankDetails;
            result.verified = bankDetails.isValid;
            break;

          case 'pan_card':
            const panValidation = validatePAN(extractedText);
            result.extractedData = {
              panNumber: panValidation.panNumber,
              name: panValidation.name,
              dob: panValidation.dob,
              isValid: panValidation.isValid
            };
            result.verified = panValidation.isValid;
            break;

          case 'aadhar_card':
            const aadharValidation = validateAadhar(extractedText);
            result.extractedData = {
              aadharNumber: aadharValidation.aadharNumber,
              name: aadharValidation.name,
              dob: aadharValidation.dob,
              isValid: aadharValidation.isValid
            };
            // Consider verified if we have the number, even if validation says otherwise
            result.verified = !!(aadharValidation.aadharNumber && aadharValidation.aadharNumber.length === 12);
            break;

          default:
            result.verified = false;
        }
      } catch (parseError) {
        console.error(`❌ Error parsing ${documentType} data:`, parseError);
        result.error = parseError.message;
      }
    } else {
      console.warn(`⚠️ No text extracted from ${documentType}`);
      result.error = 'No text could be extracted from the image. Please ensure the image is clear and readable.';
    }

    console.log(`✅ OCR processing complete. Verified: ${result.verified}`);
    console.log(`📋 Extracted data:`, JSON.stringify(result.extractedData, null, 2));
    return result;
  } catch (error) {
    console.error(`❌ OCR processing error for ${documentType}:`, error);
    console.error(`❌ Error stack:`, error.stack);
    // Return a proper error response instead of throwing
    return {
      verified: false,
      extractedData: {
        error: error.message || 'Unknown error occurred during OCR processing'
      },
      rawText: extractedText || '',
      error: error.message || 'Unknown error occurred during OCR processing'
    };
  }
};

