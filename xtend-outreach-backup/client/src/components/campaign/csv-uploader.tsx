import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileSpreadsheet, FileText } from "lucide-react";
import { parseContactsFile } from "@/lib/utils";
import { z } from "zod";
import { contactCSVSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ContactUploaderProps {
  onUploadComplete: (data: any[], listName: string) => void;
  isLoading?: boolean;
}

export function CSVUploader({ onUploadComplete, isLoading = false }: ContactUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [listName, setListName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    setFile(file);
    setListName(file.name.replace(/\.[^/.]+$/, "")); // Use filename without extension as default list name
    
    try {
      const data = await parseContactsFile(file);
      
      console.log("CSV data first row:", data[0]);
      
      // Add explicit log for TYPE/NICHE field
      console.log("TYPE field in first row:", data[0]?.TYPE);
      console.log("NICHE field in first row:", data[0]?.NICHE);
      
      // Validate required columns - INDUSTRY is now required and first
      const requiredColumns = ["INDUSTRY", "FIRST_NAME", "E_MAIL", "COMPANY"];
      const missingColumns = requiredColumns.filter(col => !Object.keys(data[0] || {}).includes(col));
      
      if (missingColumns.length > 0) {
        setValidationErrors([`Missing required columns: ${missingColumns.join(", ")}`]);
        setParsedData([]);
        return;
      }
      
      // Extra check for TYPE field - if missing but NICHE exists, map it
      if (data.length > 0 && !data[0].TYPE && data[0].NICHE) {
        console.log("TYPE field missing but NICHE exists, mapping NICHE to TYPE");
        // Add TYPE field to all rows based on NICHE
        data.forEach(row => {
          if (!row.TYPE && row.NICHE) {
            row.TYPE = row.NICHE;
            console.log(`Mapped NICHE to TYPE: ${row.NICHE}`);
          }
        });
      }
      
      // Validate each row
      const errors: string[] = [];
      const validData = [];
      
      // Special handling for STEM list files - less strict validation
      const isStemListFile = file.name.toUpperCase().includes('STEM');
      
      for (let i = 0; i < data.length; i++) {
        try {
          // For STEM files, skip email validation if industry and company exist
          if (isStemListFile && data[i].INDUSTRY && data[i].COMPANY) {
            // For STEM list files, email may be in LinkedIn field or missing
            // Just use the row as-is even if email is missing
            validData.push(data[i]);
            continue;
          }
          
          // For regular files, use standard validation
          contactCSVSchema.parse(data[i]);
          validData.push(data[i]);
        } catch (err) {
          if (err instanceof z.ZodError) {
            // For STEM list files, ignore email validation errors
            if (isStemListFile && 
                err.errors.length === 1 && 
                err.errors[0].path.includes('E_MAIL')) {
              // This is just an email validation error in a STEM file, accept it
              validData.push(data[i]);
              continue;
            }
            
            const rowErrors = err.errors.map(e => `Row ${i + 1}: ${e.path.join(".")} - ${e.message}`);
            errors.push(...rowErrors);
          }
        }
      }
      
      if (errors.length > 0) {
        // Show only first 5 errors to avoid overwhelming the user
        setValidationErrors(errors.slice(0, 5));
        
        if (errors.length > 5) {
          setValidationErrors(prev => [...prev, `...and ${errors.length - 5} more errors`]);
        }
      } else {
        setValidationErrors([]);
      }
      
      setParsedData(validData);
    } catch (error) {
      console.error('File processing error:', error);
      let errorMessage = "The file could not be parsed. Please check the format and try again.";
      let errorTitle = "Error parsing file";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific Excel-related errors better
        if (errorMessage.includes('Excel') || errorMessage.includes('XLSX') || errorMessage.includes('worksheet')) {
          errorTitle = "Excel File Error";
          
          if (file.name.toUpperCase().includes('STEM')) {
            errorMessage = `There was an issue processing your STEM LIST file. ${errorMessage} Try using the original Excel file without modifications.`;
          } else if (errorMessage.includes('no worksheets')) {
            errorMessage = "This Excel file appears to be empty or corrupted. Please verify the file and try again.";
          } else if (errorMessage.includes('Invalid format')) {
            errorMessage = "The Excel file format is invalid. Try exporting as .xlsx and uploading again.";
          }
        }
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
      
      setValidationErrors([errorMessage]);
      setParsedData([]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (['csv', 'xlsx', 'xls'].includes(fileExt)) {
        await processFile(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV or Excel (XLSX/XLS) file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = () => {
    if (parsedData.length === 0) {
      toast({
        title: "No valid data",
        description: "Please upload a valid CSV or Excel file with contact data.",
        variant: "destructive",
      });
      return;
    }
    
    if (!listName.trim()) {
      toast({
        title: "List name required",
        description: "Please provide a name for your contact list.",
        variant: "destructive",
      });
      return;
    }
    
    onUploadComplete(parsedData, listName);
  };

  // Determine file icon based on file type
  const getFileIcon = () => {
    if (!file) return <Upload className="mx-auto text-gray-400 w-10 h-10" />;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      return <FileSpreadsheet className="mx-auto text-green-600 w-10 h-10" />;
    } else if (extension === 'csv') {
      return <FileText className="mx-auto text-blue-600 w-10 h-10" />;
    }
    
    return <Upload className="mx-auto text-gray-400 w-10 h-10" />;
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="list-name">List Name</Label>
        <Input 
          id="list-name" 
          value={listName} 
          onChange={(e) => setListName(e.target.value)} 
          placeholder="My Contact List"
          className="mt-1"
        />
      </div>
      
      <div 
        ref={dropZoneRef}
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragging ? 'border-primary-DEFAULT bg-blue-50' : 'border-gray-300'} border-dashed rounded-md transition-all duration-200 ${isDragging ? 'shadow-md' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="space-y-1 text-center">
          {isDragging ? (
            <div className="animate-bounce">
              <span className="material-icons text-primary-DEFAULT text-4xl">file_download</span>
            </div>
          ) : (
            getFileIcon()
          )}
          <div className="flex text-sm text-gray-600">
            <label 
              htmlFor="file-upload" 
              className="relative cursor-pointer bg-white rounded-md font-medium text-primary-DEFAULT hover:text-primary-dark focus-within:outline-none"
            >
              <span>{file ? file.name : "Choose a file"}</span>
              <input 
                id="file-upload" 
                name="file-upload" 
                type="file" 
                accept=".csv,.xlsx,.xls" 
                className="sr-only" 
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </label>
            <p className="pl-1">or drag and drop</p>
          </div>
          <p className="text-xs text-gray-500">
            Support for CSV and Excel (XLSX/XLS) files with required columns: INDUSTRY, FIRST_NAME, E_MAIL, COMPANY
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Common column headers are auto-mapped. STEM LIST format is specially supported.
          </p>
          <details className="text-xs text-gray-500 mt-1 text-left">
            <summary className="cursor-pointer text-primary-DEFAULT hover:underline">
              View example format
            </summary>
            <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700">
              <p><strong>CSV Format Example:</strong></p>
              <pre className="overflow-x-auto text-xxs bg-gray-100 p-1 rounded">
                INDUSTRY,FIRST_NAME,LAST_NAME,E_MAIL,COMPANY,ROLE
                Technology,John,Doe,john@example.com,Tech Corp,Developer
                Marketing,Jane,Smith,jane@example.com,Marketing Inc,Manager
              </pre>
              <p className="mt-2"><strong>Mappable Headers:</strong></p>
              <p>We'll map common variations like "First Name" → "FIRST_NAME", "Email" → "E_MAIL", etc.</p>
              <p className="mt-2"><strong>STEM LIST Format:</strong></p>
              <p>For STEM LIST files, ensure your Excel file has proper headers or includes terms like "First Name", "Organization Name", etc.</p>
            </div>
          </details>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
          <p className="font-medium">Validation errors:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          
          <p className="mt-3 text-gray-700 font-medium">Tips for fixing common issues:</p>
          <ul className="list-disc pl-5 mt-1 space-y-1 text-gray-700">
            <li>Ensure your file contains these required columns: INDUSTRY, FIRST_NAME, E_MAIL, COMPANY</li>
            <li>Column names may also be formatted as "Industry", "First Name", "Email", "Company" - our system will map them</li>
            <li>For Excel files, make sure the first sheet contains your contact data</li>
            <li>Check that email addresses are properly formatted (e.g., name@example.com)</li>
            <li>If uploading a STEM LIST, use the original Excel file format without modifications</li>
          </ul>
          
          {validationErrors.some(err => err.includes('STEM LIST') || file?.name.toUpperCase().includes('STEM')) && (
            <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200 text-blue-800">
              <p className="font-medium">STEM LIST Format Help:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>For best results with STEM LIST files, upload the original Excel file</li>
                <li>We've implemented special handling for STEM LIST format</li>
                <li>If you see errors, try renaming the file to include "STEM" in the filename</li>
                <li>Verify the Excel file is not corrupted by opening it in Excel first</li>
                <li>Our system will attempt to locate the headers and map columns properly</li>
              </ul>
            </div>
          )}
        </div>
      )}
      
      {parsedData.length > 0 && (
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-2">Preview of imported contacts</h3>
          <div className="overflow-x-auto border border-gray-200 rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Name</TableHead>
                  <TableHead>Last Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Industry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedData.slice(0, 3).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.FIRST_NAME}</TableCell>
                    <TableCell>{row.LAST_NAME || ""}</TableCell>
                    <TableCell>{row.COMPANY}</TableCell>
                    <TableCell>{row.E_MAIL}</TableCell>
                    <TableCell>{row.ROLE || ""}</TableCell>
                    <TableCell>{row.INDUSTRY || ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 flex items-center text-sm text-green-600">
            <span className="material-icons text-sm mr-1">check_circle</span>
            <span>File validated successfully. {parsedData.length} contacts imported.</span>
          </div>
        </div>
      )}
      
      <Button 
        onClick={handleUpload} 
        disabled={parsedData.length === 0 || validationErrors.length > 0 || isLoading} 
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>Upload and Continue</>
        )}
      </Button>
    </div>
  );
}
