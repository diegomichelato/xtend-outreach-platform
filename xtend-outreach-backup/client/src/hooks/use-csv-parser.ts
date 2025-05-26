import { useState } from "react";
import { parseCsvFile } from "@/lib/utils";
import { contactCSVSchema } from "@shared/schema";
import { z } from "zod";

export function useCsvParser() {
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const parseCSV = async (file: File) => {
    setIsLoading(true);
    setValidationErrors([]);
    
    try {
      const data = await parseCsvFile(file);
      
      // Validate required columns
      const requiredColumns = ["FIRST_NAME", "E_MAIL", "COMPANY"];
      const missingColumns = requiredColumns.filter(col => !Object.keys(data[0] || {}).includes(col));
      
      if (missingColumns.length > 0) {
        setValidationErrors([`Missing required columns: ${missingColumns.join(", ")}`]);
        setParsedData([]);
        setIsLoading(false);
        return null;
      }
      
      // Validate each row
      const errors: string[] = [];
      const validData = [];
      
      for (let i = 0; i < data.length; i++) {
        try {
          contactCSVSchema.parse(data[i]);
          validData.push(data[i]);
        } catch (err) {
          if (err instanceof z.ZodError) {
            const rowErrors = err.errors.map(e => `Row ${i + 1}: ${e.path.join(".")} - ${e.message}`);
            errors.push(...rowErrors);
          }
        }
      }
      
      if (errors.length > 0) {
        setValidationErrors(errors);
      }
      
      setParsedData(validData);
      setIsLoading(false);
      return validData;
    } catch (error) {
      setValidationErrors(["Failed to parse CSV file. Please check the format and try again."]);
      setParsedData([]);
      setIsLoading(false);
      return null;
    }
  };

  return {
    parseCSV,
    parsedData,
    validationErrors,
    isLoading,
  };
}
