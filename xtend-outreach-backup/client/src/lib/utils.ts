import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const formatRelativeTime = (date: Date | string): string => {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();
  
  const diffInSecs = Math.floor(diffInMs / 1000);
  const diffInMins = Math.floor(diffInSecs / 60);
  const diffInHours = Math.floor(diffInMins / 60);
  const diffInDays = Math.floor(diffInHours / 24);
  
  if (diffInDays > 30) {
    return formatDate(date);
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  } else if (diffInMins > 0) {
    return `${diffInMins} minute${diffInMins > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export const formatPercentage = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '--';
  return `${value.toFixed(1)}%`;
};

// Normalize contact type to standard values (Brand, Agency, Creator, Media, Other)
export const normalizeContactType = (type: string | undefined | null): string => {
  if (!type) return "Brand"; // Default to Brand if not provided
  
  // Convert to lowercase for case-insensitive comparison
  const typeLower = type.toLowerCase().trim();
  
  // Map common variations to standard values
  if (typeLower.includes('brand')) return "Brand";
  if (typeLower.includes('agency')) return "Agency";  
  if (typeLower.includes('creator') || typeLower.includes('influencer')) return "Creator";
  if (typeLower.includes('media') || typeLower.includes('press')) return "Media";
  
  // Capitalize first letter for any other values
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

export const getStatusColor = (status: string): { bg: string; text: string } => {
  switch (status.toLowerCase()) {
    case 'active':
      return { bg: 'bg-green-100', text: 'text-green-800' };
    case 'scheduled':
      return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    case 'draft':
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
    case 'paused':
      return { bg: 'bg-orange-100', text: 'text-orange-800' };
    case 'completed':
      return { bg: 'bg-blue-100', text: 'text-blue-800' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800' };
  }
};

import * as XLSX from 'xlsx';

export const parseContactsFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (!event.target || !event.target.result) {
        console.error('File read error: No result from FileReader');
        reject(new Error('Failed to read file'));
        return;
      }
      
      try {
        console.log('Parsing file:', file.name, 'size:', file.size);
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        
        // For Excel files
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          const data = new Uint8Array(event.target.result as ArrayBuffer);
          let workbook;
          try {
            workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
            console.log('Excel workbook read successfully. Sheet names:', workbook.SheetNames);
          } catch (error) {
            console.error('Error reading Excel file:', error);
            reject(new Error(`Error reading Excel file: ${error instanceof Error ? error.message : 'Invalid format'}`));
            return;
          }
          
          // Get the first sheet
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error('Excel file contains no worksheets'));
            return;
          }
          
          const firstSheetName = workbook.SheetNames[0];
          if (!firstSheetName) {
            reject(new Error('Could not read the worksheet name'));
            return;
          }
          
          const worksheet = workbook.Sheets[firstSheetName];
          if (!worksheet) {
            reject(new Error(`Could not read worksheet "${firstSheetName}"`));
            return;
          }
          
          // Special case handling for STEM LIST format based on filename
          const isStemListFormatFileName = file.name.toUpperCase().includes('STEM');
          
          // Convert to JSON with raw values to handle dates properly
          let jsonData;
          try {
            if (isStemListFormatFileName) {
              console.log('Using special STEM LIST parsing settings');
              jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                raw: false,
                defval: '',
                blankrows: false,
                // Don't force header format for STEM LIST files
                // This allows the parser to automatically detect the headers
              });
              console.log('Special STEM LIST parsing result:', jsonData.slice(0, 3));
            } else {
              jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                raw: false,
                defval: '',
                blankrows: false
              });
            }
          } catch (error) {
            console.error('Error converting Excel to JSON:', error);
            reject(new Error(`Error parsing Excel data: ${error instanceof Error ? error.message : 'Invalid format'}`));
            return;
          }
          
          console.log('Excel data:', jsonData.slice(0, 2));
          
          // Safety check for empty data
          if (!jsonData || jsonData.length === 0) {
            reject(new Error('No data found in the Excel file'));
            return;
          }
          
          // Try to detect the first row's keys safely
          let firstRowKeys: string[] = [];
          try {
            if (jsonData[0] && typeof jsonData[0] === 'object') {
              firstRowKeys = Object.keys(jsonData[0]);
            }
          } catch (err) {
            console.error('Error getting keys from first row:', err);
          }
          
          // Check if this is STEM LIST format with more robust detection
          const isStemListFormat = 
            file.name.toUpperCase().includes('STEM') || 
            (firstRowKeys.some(k => {
              const upperKey = k.toUpperCase().trim();
              return upperKey === 'FIRST NAME' || 
                     upperKey === 'ORGANIZATION NAME' || 
                     upperKey === 'JOB TITLE' ||
                     upperKey === 'COMPANY NAME' ||
                     upperKey === 'POSITION' ||
                     upperKey === 'NICHE' ||
                     upperKey === 'E-MAIL' ||
                     upperKey === 'E_MAIL' ||
                     upperKey === 'BUSINESS E-MAIL';
            })) ||
            // Also check for variations in capitalization and spacing
            (firstRowKeys.some(k => 
              ['FIRSTNAME', 'FIRST_NAME', 'FIRST-NAME', 'EMAIL', 'INDUSTRY'].includes(k.toUpperCase().replace(/\s+/g, ''))));
          
          console.log('Is STEM LIST format?', isStemListFormat, 'First row keys:', firstRowKeys);
          
          if (isStemListFormat) {
            console.log('Detected STEM List format');
            
            // For STEM LIST with column headers A, B, C, etc. (special case)
            if (isStemListFormatFileName && firstRowKeys.some(k => k === 'A' || k === 'B' || k === 'C')) {
              console.log('Processing as STEM LIST with letter headers');
              
              // Try to detect header row position by looking for common header names
              const headerRowIndex = jsonData.findIndex((row: any) => {
                if (!row) return false;
                return Object.values(row).some((val: any) => 
                  typeof val === 'string' && 
                  (val.includes('First Name') || val.includes('Email') || val.includes('Organization'))
                );
              });
              
              console.log('Header row found at index:', headerRowIndex);
              
              // If we found a header row, use it to determine column mapping
              let columnMap: Record<string, string> = {};
              
              if (headerRowIndex >= 0) {
                const headerRow = jsonData[headerRowIndex];
                
                // Create mapping from letter columns to semantic names
                Object.entries(headerRow).forEach(([key, value]) => {
                  if (typeof value === 'string') {
                    const upperValue = value.toUpperCase().trim();
                    if (upperValue.includes('FIRST') && upperValue.includes('NAME'))
                      columnMap[key] = 'FIRST_NAME';
                    else if (upperValue.includes('LAST') && upperValue.includes('NAME'))
                      columnMap[key] = 'LAST_NAME';
                    else if (upperValue.includes('EMAIL') || upperValue === 'E-MAIL' || upperValue === 'E_MAIL')
                      columnMap[key] = 'E_MAIL';
                    else if (upperValue.includes('ORGANIZATION') || upperValue.includes('COMPANY'))
                      columnMap[key] = 'COMPANY';
                    else if (upperValue.includes('TITLE') || upperValue.includes('POSITION') || upperValue.includes('ROLE'))
                      columnMap[key] = 'ROLE';
                    else if (upperValue.includes('TYPE') || upperValue.includes('CATEGORY') || upperValue.includes('CLIENT_TYPE') || upperValue.includes('NICHE'))
                      columnMap[key] = 'TYPE';
                    else if (upperValue.includes('INDUSTRY') || upperValue.includes('SECTOR'))
                      columnMap[key] = 'INDUSTRY';
                    else if (upperValue.includes('COUNTRY') || upperValue.includes('NATION'))
                      columnMap[key] = 'COUNTRY';
                    else if (upperValue.includes('LINKEDIN'))
                      columnMap[key] = 'LINKEDIN';
                    else if (upperValue.includes('WEBSITE') || upperValue.includes('URL'))
                      columnMap[key] = 'WEBSITE';
                  }
                });
                
                console.log('Column mapping:', columnMap);
                
                // Process data rows (skip the header row)
                const mappedData = jsonData.slice(headerRowIndex + 1).map((row: any) => {
                  if (!row) return null;
                  
                  const mappedRow: Record<string, string> = {
                    'TYPE': '',
                    'FIRST_NAME': '',
                    'LAST_NAME': '',
                    'E_MAIL': '',
                    'COMPANY': '',
                    'ROLE': '',
                    'INDUSTRY': '',
                    'COUNTRY': '',
                    'LINKEDIN': '',
                    'WEBSITE': ''
                  };
                  
                  // Map using our column mapping
                  Object.entries(columnMap).forEach(([columnKey, semanticKey]) => {
                    if (row[columnKey]) {
                      mappedRow[semanticKey] = row[columnKey];
                    }
                  });
                  
                  return mappedRow;
                }).filter(row => row && row.FIRST_NAME && row.E_MAIL);
                
                if (mappedData.length > 0) {
                  console.log('Successfully mapped STEM LIST data with column detection', mappedData.slice(0, 2));
                  resolve(mappedData);
                  return;
                }
              }
            }
            
            // Standard mapping approach for STEM LIST format (fallback)
            console.log('Using standard STEM LIST mapping approach');
            const stemListData = jsonData.map((row: any, index: number) => {
              // Handle row being undefined or null
              if (!row) {
                console.log(`Skipping empty row at index ${index}`);
                return null;
              }
              
              // Check and map row properly across different possible column formats
              let firstName = '';
              let lastName = '';
              let email = '';
              let company = '';
              let role = '';
              let type = '';
              let industry = '';
              let country = '';
              let linkedin = '';
              let website = '';
              let businessEmail = '';
              let niche = '';
              
              // Exhaustive checking of all possible formats
              if (typeof row === 'object' && row !== null) {
                Object.entries(row).forEach(([key, value]) => {
                  if (!value) return;
                  
                  const upperKey = typeof key === 'string' ? key.toUpperCase().trim() : '';
                  
                  // First name variations
                  if (upperKey.includes('FIRST') && upperKey.includes('NAME'))
                    firstName = value as string;
                  else if (upperKey === 'FIRSTNAME' || upperKey === 'FNAME' || upperKey === 'G')
                    firstName = value as string;
                  
                  // Last name variations
                  else if (upperKey.includes('LAST') && upperKey.includes('NAME'))
                    lastName = value as string;
                  else if (upperKey === 'LASTNAME' || upperKey === 'LNAME' || upperKey === 'H')
                    lastName = value as string;
                  
                  // Email variations - check for multiple formats and exclude business email
                  else if ((upperKey.includes('EMAIL') || 
                          upperKey === 'E-MAIL' || 
                          upperKey === 'E_MAIL' || 
                          upperKey === 'MAIL' || 
                          upperKey === 'J') && 
                          !upperKey.includes('BUSINESS'))
                    email = value as string;
                  
                  // Business Email variations
                  else if ((upperKey.includes('BUSINESS') && upperKey.includes('EMAIL')) || 
                          upperKey === 'BUSINESS E-MAIL' || 
                          upperKey === 'BUSINESS_E_MAIL' || 
                          upperKey === 'WORK EMAIL' ||
                          upperKey === 'F')
                    businessEmail = value as string;
                  
                  // Company/Organization variations
                  else if (upperKey.includes('ORGANIZATION') || 
                          upperKey.includes('COMPANY') || 
                          upperKey.includes('FIRM') ||
                          upperKey === 'C')
                    company = value as string;
                  
                  // Role/Position/Title variations
                  else if (upperKey.includes('TITLE') || 
                          upperKey.includes('POSITION') || 
                          upperKey.includes('ROLE') || 
                          upperKey.includes('JOB') ||
                          upperKey === 'I')
                    role = value as string;
                  
                  // Industry variations
                  else if (upperKey.includes('INDUSTRY') || 
                          upperKey.includes('SECTOR') ||
                          upperKey === 'B')
                    industry = value as string;
                  
                  // Type/Category/Niche variations - separate TYPE and NICHE
                  else if (upperKey === 'TYPE' || upperKey === 'CATEGORY' || upperKey === 'CLIENT_TYPE' || upperKey === 'A')
                    type = value as string;
                  else if (upperKey === 'NICHE')
                    niche = value as string;
                  
                  // Country variations
                  else if (upperKey.includes('COUNTRY') || 
                          upperKey.includes('NATION') ||
                          upperKey === 'D')
                    country = value as string;
                  
                  // LinkedIn variations
                  else if (upperKey.includes('LINKEDIN') || 
                          upperKey === 'LI' ||
                          upperKey === 'L')
                    linkedin = value as string;
                  
                  // Website variations
                  else if (upperKey.includes('WEBSITE') || 
                          upperKey.includes('URL') || 
                          upperKey.includes('WEB') ||
                          upperKey === 'E')
                    website = value as string;
                });
              }
              
              // Direct lookup tries before giving up
              if (!firstName) firstName = row['First Name'] || row['FIRST NAME'] || row['FIRST_NAME'] || '';
              if (!lastName) lastName = row['Last Name'] || row['LAST NAME'] || row['LAST_NAME'] || '';
              if (!email) email = row['Email'] || row['E-MAIL'] || row['E_MAIL'] || row['EMAIL'] || '';
              if (!company) company = row['Organization Name'] || row['Company'] || row['COMPANY'] || row['ORGANIZATION'] || '';
              if (!role) role = row['Job Title'] || row['Position'] || row['ROLE'] || row['TITLE'] || '';
              if (!industry) industry = row['Industry'] || row['INDUSTRY'] || row['SECTOR'] || '';
              if (!type) type = row['Type'] || row['TYPE'] || row['Category'] || row['CATEGORY'] || '';
              if (!niche) niche = row['Niche'] || row['NICHE'] || type || '';
              if (!country) country = row['Country'] || row['COUNTRY'] || '';
              if (!linkedin) linkedin = row['LinkedIn URL'] || row['LinkedIn'] || row['LINKEDIN'] || '';
              if (!website) website = row['Company Website'] || row['Website'] || row['WEBSITE'] || row['URL'] || '';
              // Use the businessEmail variable that was already declared
              businessEmail = row['BUSINESS E-MAIL'] || row['BUSINESS_EMAIL'] || row['Business Email'] || businessEmail || '';
              
              // If business email exists but regular email doesn't, use business email
              if (!email && businessEmail) {
                email = businessEmail;
              }
              
              // For STEM LIST format, we want to be more lenient with validation
              // Require only industry and company
              const hasIndustry = !!industry;
              const hasCompany = !!company;
              
              // Customized validation based on file type
              const isStemList = file.name.toUpperCase().includes('STEM');
              
              // Create standardized field names for storage in the database
              const result = {
                'type': type,
                'niche': niche || type,
                'first_name': firstName,
                'last_name': lastName,
                'email': email,
                'company': company,
                'role': role,
                'industry': industry,
                'country': country,
                'linkedin': linkedin,
                'website': website,
                'business_email': businessEmail,
                // Also include uppercase versions for backwards compatibility
                'TYPE': type,
                'NICHE': niche || type,
                'FIRST_NAME': firstName,
                'LAST_NAME': lastName,
                'E_MAIL': email,
                'COMPANY': company,
                'ROLE': role,
                'INDUSTRY': industry,
                'COUNTRY': country,
                'LINKEDIN': linkedin,
                'WEBSITE': website,
                'BUSINESS_E_MAIL': businessEmail
              };
              
              // Different validation rules for different file types
              if (isStemList) {
                // For STEM list files, accept ANY row that has either industry OR company
                // This is much more lenient than our normal validation
                if (hasIndustry || hasCompany) {
                  console.log(`STEM list row accepted: ${company || 'Unknown company'} (${industry || 'Unknown industry'})`);
                  return result;
                }
              } else {
                // For normal contacts, require more complete information
                if ((firstName || email) && (industry || company)) {
                  return result;
                }
              }
              
              // Log what's missing
              console.log("Row skipped, missing required fields:", {
                hasIndustry,
                hasCompany,
                hasName: !!firstName,
                hasEmail: !!email,
                isStemList
              });
              
              return null;
            }).filter(row => row !== null); // Filter out invalid rows
            
            resolve(stemListData);
            return;
          }
          
          // Map column names to our expected format if needed
          const mappedData = jsonData.map((row: any) => {
            // Handle null/undefined row
            if (!row) return {
              'FIRST_NAME': '',
              'LAST_NAME': '',
              'E_MAIL': '',
              'COMPANY': '',
              'ROLE': '',
              'INDUSTRY': '',
              'PHONE': '',
              'LINKEDIN': '',
              'COUNTRY': '',
              'WEBSITE': '',
              'BUSINESS_EMAIL': ''
            };
            
            // Create a new object with our expected column names
            const mappedRow: Record<string, any> = {
              'INDUSTRY': '', // Move INDUSTRY to first position
              'FIRST_NAME': '',
              'LAST_NAME': '',
              'E_MAIL': '',
              'COMPANY': '',
              'ROLE': '',
              'TYPE': '',
              'PHONE': '',
              'LINKEDIN': '',
              'COUNTRY': '',
              'WEBSITE': '',
              'BUSINESS_EMAIL': ''
            };
            
            // Map common Excel column names to our expected format
            Object.keys(row).forEach(key => {
              // Skip empty keys or values
              if (!key || !row[key]) return;
              
              const uppercaseKey = key.toUpperCase().trim();
              
              // Map common variations of column names
              if (uppercaseKey.includes('FIRST') && uppercaseKey.includes('NAME')) 
                mappedRow['FIRST_NAME'] = row[key];
              else if (uppercaseKey === 'FIRSTNAME' || uppercaseKey === 'FNAME')
                mappedRow['FIRST_NAME'] = row[key];
              else if (uppercaseKey.includes('LAST') && uppercaseKey.includes('NAME')) 
                mappedRow['LAST_NAME'] = row[key];
              else if (uppercaseKey === 'LASTNAME' || uppercaseKey === 'LNAME')
                mappedRow['LAST_NAME'] = row[key];
              else if (uppercaseKey.includes('EMAIL') || uppercaseKey === 'E-MAIL' || uppercaseKey === 'E_MAIL' || uppercaseKey === 'MAIL') 
                mappedRow['E_MAIL'] = row[key];
              else if (uppercaseKey.includes('COMPANY') || uppercaseKey.includes('ORGANIZATION') || uppercaseKey.includes('FIRM')) 
                mappedRow['COMPANY'] = row[key];
              else if (uppercaseKey.includes('ROLE') || uppercaseKey.includes('POSITION') || uppercaseKey.includes('TITLE') || uppercaseKey.includes('JOB'))
                mappedRow['ROLE'] = row[key];
              else if (uppercaseKey.includes('INDUSTRY') || uppercaseKey.includes('SECTOR') || uppercaseKey.includes('FIELD'))
                mappedRow['INDUSTRY'] = row[key];
              else if (uppercaseKey.includes('PHONE') || uppercaseKey.includes('MOBILE') || uppercaseKey.includes('TEL'))
                mappedRow['PHONE'] = row[key];
              else if ((uppercaseKey.includes('LINKED') && uppercaseKey.includes('IN')) || uppercaseKey === 'LI')
                mappedRow['LINKEDIN'] = row[key];
              else if (uppercaseKey.includes('COUNTRY') || uppercaseKey.includes('NATION') || uppercaseKey.includes('LOCATION'))
                mappedRow['COUNTRY'] = row[key];
              else if (uppercaseKey.includes('WEBSITE') || uppercaseKey.includes('SITE') || uppercaseKey.includes('URL') || uppercaseKey.includes('WEB'))
                mappedRow['WEBSITE'] = row[key];
              else if (uppercaseKey.includes('BUSINESS') && uppercaseKey.includes('EMAIL'))
                mappedRow['BUSINESS_EMAIL'] = row[key];
              else
                mappedRow[key] = row[key]; // Keep the original key for any unmapped columns
            });
            
            // Fallback to original columns if mapping failed to identify required fields
            if (!mappedRow['FIRST_NAME'] && row['First Name']) {
              mappedRow['FIRST_NAME'] = row['First Name'];
            }
            
            if (!mappedRow['E_MAIL'] && row['Email']) {
              mappedRow['E_MAIL'] = row['Email'];
            }
            
            if (!mappedRow['COMPANY'] && row['Company']) {
              mappedRow['COMPANY'] = row['Company'];
            }
            
            if (!mappedRow['TYPE'] && row['Type']) {
              mappedRow['TYPE'] = row['Type'];
            } else if (!mappedRow['TYPE'] && row['Category']) {
              mappedRow['TYPE'] = row['Category'];
            } else if (!mappedRow['TYPE'] && row['Niche']) {
              mappedRow['TYPE'] = row['Niche'];
            }
            
            // Ensure TYPE is capitalized properly
            if (mappedRow['TYPE']) {
              mappedRow['TYPE'] = mappedRow['TYPE'].toString().charAt(0).toUpperCase() + 
                                 mappedRow['TYPE'].toString().slice(1).toLowerCase();
            }
            
            return mappedRow;
          }).filter(row => row.INDUSTRY && row.FIRST_NAME && row.E_MAIL && row.COMPANY); // Filter out incomplete rows
          
          if (mappedData.length === 0) {
            reject(new Error('No valid contacts found in file. Ensure your file has Industry, First Name, Email, and Company columns.'));
            return;
          }
          
          resolve(mappedData);
          return;
        }
        
        // For CSV files
        if (fileExtension === 'csv') {
          const csvData = event.target.result as string;
          const lines = csvData.split('\n');
          const headers = lines[0].split(',').map(header => header.trim());
          
          const result = [];
          
          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = lines[i].split(',').map(value => value.trim());
            const row: Record<string, string> = {};
            const mappedRow: Record<string, any> = {
              'TYPE': '',       // Add TYPE field
              'INDUSTRY': '',   // Move INDUSTRY to first position
              'FIRST_NAME': '',
              'LAST_NAME': '',
              'E_MAIL': '',
              'COMPANY': '',
              'ROLE': '',
              'PHONE': '',
              'LINKEDIN': '',
              'COUNTRY': '',
              'WEBSITE': ''
            };
            
            for (let j = 0; j < headers.length; j++) {
              if (j >= values.length) continue;
              
              const headerKey = headers[j].toUpperCase().trim();
              const value = values[j] || '';
              
              row[headers[j]] = value;
              
              // Map to our standardized keys
              if (headerKey.includes('FIRST') && headerKey.includes('NAME')) 
                mappedRow['FIRST_NAME'] = value;
              else if (headerKey === 'FIRSTNAME' || headerKey === 'FNAME')
                mappedRow['FIRST_NAME'] = value;
              else if (headerKey.includes('LAST') && headerKey.includes('NAME')) 
                mappedRow['LAST_NAME'] = value;
              else if (headerKey === 'LASTNAME' || headerKey === 'LNAME')
                mappedRow['LAST_NAME'] = value;
              else if (headerKey.includes('EMAIL') || headerKey === 'E-MAIL' || headerKey === 'MAIL')
                mappedRow['E_MAIL'] = value;
              else if (headerKey.includes('COMPANY') || headerKey.includes('ORGANIZATION') || headerKey.includes('FIRM'))
                mappedRow['COMPANY'] = value;
              else if (headerKey.includes('ROLE') || headerKey.includes('POSITION') || headerKey.includes('TITLE') || headerKey.includes('JOB'))
                mappedRow['ROLE'] = value;
              else if (headerKey.includes('INDUSTRY') || headerKey.includes('SECTOR') || headerKey.includes('FIELD'))
                mappedRow['INDUSTRY'] = value;
              else if (headerKey.includes('TYPE') || headerKey.includes('CATEGORY') || headerKey.includes('CLIENT_TYPE') || headerKey.includes('NICHE')) {
                mappedRow['TYPE'] = value;
                console.log(`Found TYPE field with header "${headerKey}", value: "${value}"`);
              }
              else if (headerKey.includes('PHONE') || headerKey.includes('MOBILE') || headerKey.includes('TEL'))
                mappedRow['PHONE'] = value;
              else if ((headerKey.includes('LINKED') && headerKey.includes('IN')) || headerKey === 'LI')
                mappedRow['LINKEDIN'] = value;
              else if (headerKey.includes('COUNTRY') || headerKey.includes('NATION') || headerKey.includes('LOCATION'))
                mappedRow['COUNTRY'] = value;
              else if (headerKey.includes('WEBSITE') || headerKey.includes('SITE') || headerKey.includes('URL') || headerKey.includes('WEB'))
                mappedRow['WEBSITE'] = value;
            }
            
            // Special handling for STEM LIST format
            if (file.name.toUpperCase().includes('STEM')) {
              // Map the specific STEM LIST format columns directly
              // For STEM LIST: Very important to map NICHE to TYPE field
              console.log('Processing STEM LIST format row with NICHE:', row['NICHE']);
              
              const stemRow = {
                'TYPE': row['TYPE'] || row['NICHE'] || row['CATEGORY'] || '',
                'INDUSTRY': row['INDUSTRY'] || '',
                'FIRST_NAME': row['FIRST NAME'] || '',
                'LAST_NAME': row['LAST NAME'] || '',
                'E_MAIL': row['E-MAIL'] || '',
                'COMPANY': row['COMPANY'] || '',
                'ROLE': row['BUSINESS ROLE'] || '',
                'COUNTRY': row['COUNTRY'] || '',
                'LINKEDIN': row['LINKEDIN'] || row['BUSINESS LINKEDIN'] || '',
                'WEBSITE': row['URL'] || row['BUSINESS URL'] || ''
              };
              
              // Debug logging for TYPE field mapping
              console.log('After STEM mapping, TYPE field =', stemRow.TYPE);
              console.log("Mapped STEM row:", stemRow);
              result.push(stemRow);
            } else {
              result.push(mappedRow);
            }
          }
          
          // Filter out rows without required fields and handle various column naming formats
          const validResults = result.filter(row => {
            // Debug log the row being processed
            console.log("Processing row:", row);
            
            // Handle TYPE/NICHE field - add mappings for TYPE fields with variations
            if (row.NICHE && !row.TYPE && !row['TYPE']) {
              // If NICHE exists but TYPE doesn't, copy NICHE to TYPE
              row.TYPE = row.NICHE;
              console.log(`Copied NICHE to TYPE: ${row.NICHE}`);
            }
            
            // Check for required fields with different possible capitalization patterns
            const hasIndustry = 
              row.INDUSTRY || 
              row['INDUSTRY'] || 
              row.Industry || 
              row['Industry'] || 
              row.industry;
            
            const hasFirstName = 
              row.FIRST_NAME || 
              row['FIRST_NAME'] || 
              row['First Name'] || 
              row.FirstName || 
              row['FIRST NAME'];
            
            const hasEmail = 
              row.E_MAIL || 
              row['E_MAIL'] || 
              row.EMAIL || 
              row['EMAIL'] || 
              row.Email || 
              row['Email'] || 
              row.email || 
              row['E-MAIL'] ||
              row['e-mail'];
            
            const hasCompany = 
              row.COMPANY || 
              row['COMPANY'] || 
              row.Company || 
              row['Company'] || 
              row.company;
              
            const isValidRow = hasIndustry && hasFirstName && hasEmail && hasCompany;
            
            if (!isValidRow) {
              console.log("Invalid row missing required fields:", { 
                hasIndustry, hasFirstName, hasEmail, hasCompany, 
                rowData: JSON.stringify(row) 
              });
            }
            
            return isValidRow;
          });
          
          if (validResults.length === 0) {
            reject(new Error('No valid contacts found in file. Ensure your file has Industry, First Name, Email, and Company columns.'));
            return;
          }
          
          resolve(validResults);
          return;
        }
        
        reject(new Error('Unsupported file format. Please upload a CSV or Excel file.'));
      } catch (error) {
        console.error('Error parsing file:', error);
        // Provide more detailed error messages
        if (error instanceof Error) {
          reject(new Error(`Error parsing file: ${error.message}`));
        } else if (error && typeof error === 'object') {
          // Try to extract information from the error object
          try {
            const errorStr = JSON.stringify(error);
            reject(new Error(`Error parsing file: ${errorStr}`));
          } catch (e) {
            reject(new Error('Error parsing file: Invalid file format or corrupt file'));
          }
        } else {
          reject(new Error('Error parsing file: The file format is not supported or the file is corrupt'));
        }
      }
    };
    
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Error reading file'));
    };
    
    // Different read method based on file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
};

// For backward compatibility
export const parseCsvFile = parseContactsFile;
