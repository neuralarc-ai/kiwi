/**
 * Document Verification System
 * Matches data across PAN, Aadhaar, and Bank documents
 * Calculates verification score and flags issues
 */

/**
 * Normalize name for comparison (remove extra spaces, convert to uppercase)
 */
const normalizeName = (name) => {
  if (!name) return '';
  return name.toUpperCase().trim().replace(/\s+/g, ' ');
};

/**
 * Compare two names (fuzzy matching)
 */
const compareNames = (name1, name2) => {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);
  
  if (normalized1 === normalized2) return { match: true, score: 100 };
  
  // Check if one contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return { match: true, score: 80 };
  }
  
  // Split into words and compare
  const words1 = normalized1.split(' ').filter(w => w.length > 2);
  const words2 = normalized2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) {
    return { match: false, score: 0 };
  }
  
  // Count matching words
  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }
  
  const score = (matches / Math.max(words1.length, words2.length)) * 100;
  return { match: score >= 60, score: Math.round(score) };
};

/**
 * Normalize date for comparison
 */
const normalizeDate = (dateStr) => {
  if (!dateStr) return null;
  
  // Handle different date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const cleaned = dateStr.replace(/[\.\-]/g, '/');
  const parts = cleaned.split('/');
  
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}/${month}/${year}`;
  }
  
  return dateStr;
};

/**
 * Compare two dates
 */
const compareDates = (date1, date2) => {
  const normalized1 = normalizeDate(date1);
  const normalized2 = normalizeDate(date2);
  
  if (!normalized1 || !normalized2) {
    return { match: false, score: 0 };
  }
  
  if (normalized1 === normalized2) {
    return { match: true, score: 100 };
  }
  
  return { match: false, score: 0 };
};

/**
 * Verify documents and calculate score
 */
export const verifyDocuments = (employeeData, panData, aadhaarData, bankData) => {
  const flags = [];
  let score = 0;
  let maxScore = 0;
  
  // 1. PAN ↔ Aadhaar Name Match (30 points)
  maxScore += 30;
  if (panData?.name && aadhaarData?.name) {
    const nameMatch = compareNames(panData.name, aadhaarData.name);
    if (nameMatch.match) {
      score += (nameMatch.score / 100) * 30;
    } else {
      flags.push({
        type: 'name_mismatch',
        severity: 'high',
        message: `Name mismatch between PAN (${panData.name}) and Aadhaar (${aadhaarData.name})`,
        documents: ['PAN', 'Aadhaar']
      });
    }
  } else {
    flags.push({
      type: 'missing_name',
      severity: 'medium',
      message: 'Name not found in PAN or Aadhaar document',
      documents: panData?.name ? ['Aadhaar'] : ['PAN']
    });
  }
  
  // 2. PAN ↔ Aadhaar DOB Match (20 points)
  maxScore += 20;
  if (panData?.dob && aadhaarData?.dob) {
    const dobMatch = compareDates(panData.dob, aadhaarData.dob);
    if (dobMatch.match) {
      score += 20;
    } else {
      flags.push({
        type: 'dob_mismatch',
        severity: 'high',
        message: `Date of Birth mismatch between PAN (${panData.dob}) and Aadhaar (${aadhaarData.dob})`,
        documents: ['PAN', 'Aadhaar']
      });
    }
  } else {
    flags.push({
      type: 'missing_dob',
      severity: 'medium',
      message: 'Date of Birth not found in PAN or Aadhaar document',
      documents: panData?.dob ? ['Aadhaar'] : ['PAN']
    });
  }
  
  // 3. PAN/Aadhaar ↔ Bank Name Match (25 points)
  maxScore += 25;
  if (bankData?.accountHolderName) {
    let nameMatched = false;
    let bestMatch = { score: 0 };
    
    if (panData?.name) {
      const match = compareNames(panData.name, bankData.accountHolderName);
      if (match.score > bestMatch.score) {
        bestMatch = match;
        nameMatched = match.match;
      }
    }
    
    if (aadhaarData?.name) {
      const match = compareNames(aadhaarData.name, bankData.accountHolderName);
      if (match.score > bestMatch.score) {
        bestMatch = match;
        nameMatched = match.match;
      }
    }
    
    if (nameMatched) {
      score += (bestMatch.score / 100) * 25;
    } else {
      flags.push({
        type: 'bank_name_mismatch',
        severity: 'high',
        message: `Bank account holder name (${bankData.accountHolderName}) does not match PAN/Aadhaar name`,
        documents: ['Bank Details', panData?.name ? 'PAN' : 'Aadhaar']
      });
    }
  } else {
    flags.push({
      type: 'missing_bank_name',
      severity: 'medium',
      message: 'Account holder name not found in bank details',
      documents: ['Bank Details']
    });
  }
  
  // 4. Employee Name ↔ Document Names Match (15 points)
  maxScore += 15;
  const employeeFullName = `${employeeData.first_name || ''} ${employeeData.last_name || ''}`.trim();
  if (employeeFullName) {
    let employeeNameMatched = false;
    let bestMatch = { score: 0 };
    let matchedDocument = null;
    
    if (panData?.name) {
      const match = compareNames(employeeFullName, panData.name);
      if (match.score > bestMatch.score) {
        bestMatch = match;
        employeeNameMatched = match.match;
        matchedDocument = 'PAN';
      }
    }
    
    // Explicit check for Aadhaar name matching
    if (aadhaarData?.name) {
      const aadhaarMatch = compareNames(employeeFullName, aadhaarData.name);
      if (aadhaarMatch.score > bestMatch.score) {
        bestMatch = aadhaarMatch;
        employeeNameMatched = aadhaarMatch.match;
        matchedDocument = 'Aadhaar';
      }
      
      // Add specific flag if Aadhaar name doesn't match
      if (!aadhaarMatch.match || aadhaarMatch.score < 60) {
        flags.push({
          type: 'aadhaar_name_mismatch',
          severity: aadhaarMatch.score < 40 ? 'high' : 'medium',
          message: `Employee name (${employeeFullName}) does not match Aadhaar name (${aadhaarData.name}). Match score: ${aadhaarMatch.score}%`,
          documents: ['Employee Data', 'Aadhaar'],
          matchScore: aadhaarMatch.score
        });
      }
    }
    
    if (employeeNameMatched) {
      score += (bestMatch.score / 100) * 15;
    } else {
      flags.push({
        type: 'employee_name_mismatch',
        severity: 'medium',
        message: `Employee name (${employeeFullName}) does not match document names`,
        documents: ['Employee Data', 'PAN/Aadhaar']
      });
    }
  }
  
  // 5. Document Validity (10 points)
  maxScore += 10;
  let validDocs = 0;
  if (panData?.panNumber) validDocs++;
  if (aadhaarData?.aadharNumber) validDocs++;
  if (bankData?.accountNumber && bankData?.ifscCode) validDocs++;
  
  if (validDocs === 3) {
    score += 10;
  } else {
    flags.push({
      type: 'incomplete_documents',
      severity: 'high',
      message: `Only ${validDocs} out of 3 documents are complete`,
      documents: ['All Documents']
    });
  }
  
  const finalScore = Math.round((score / maxScore) * 100);
  
  // Determine verification status
  let verificationStatus = 'pending';
  if (finalScore >= 80 && flags.filter(f => f.severity === 'high').length === 0) {
    verificationStatus = 'approved';
  } else if (finalScore >= 60) {
    verificationStatus = 'review_required';
  } else {
    verificationStatus = 'rejected';
  }
  
  return {
    score: finalScore,
    maxScore: 100,
    verificationStatus,
    flags,
    details: {
      panAadhaarNameMatch: panData?.name && aadhaarData?.name ? compareNames(panData.name, aadhaarData.name) : null,
      panAadhaarDOBMatch: panData?.dob && aadhaarData?.dob ? compareDates(panData.dob, aadhaarData.dob) : null,
      bankNameMatch: bankData?.accountHolderName ? {
        pan: panData?.name ? compareNames(panData.name, bankData.accountHolderName) : null,
        aadhaar: aadhaarData?.name ? compareNames(aadhaarData.name, bankData.accountHolderName) : null
      } : null,
      documentsValid: validDocs === 3
    }
  };
};

