import { useState, useEffect, useRef } from 'react'
import { X, Upload, User, FileText, CreditCard, Receipt, CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { apiService } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import type { GoogleMapsAutocomplete, GoogleMapsPlaceResult } from '@/types/google-maps'

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyB7ZYnoirMCaXKigVgF7m7HBSoj7aDiyzk'

interface AddEmployeeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  employee?: any // For editing
}

const departments = [
  'Engineering',
  'Marketing',
  'Sales',
  'HR',
  'Finance',
  'Operations',
  'Design',
  'Product',
  'Support',
  'Legal',
  'Others'
]

const employeeTypes = [
  'Employee',
  'Consultant',
  'Others'
]

export default function AddEmployeeModal({ isOpen, onClose, onSuccess, employee }: AddEmployeeModalProps) {
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Document files (only PAN and Aadhaar - bank details are manual entry)
  const [panCardFile, setPanCardFile] = useState<File | null>(null)
  const [aadharCardFile, setAadharCardFile] = useState<File | null>(null)
  const [panCardVerifying, setPanCardVerifying] = useState(false)
  const [aadharCardVerifying, setAadharCardVerifying] = useState(false)
  const [panCardVerified, setPanCardVerified] = useState(false)
  const [aadharCardVerified, setAadharCardVerified] = useState(false)
  const [panCardFailed, setPanCardFailed] = useState(false)
  const [aadharCardFailed, setAadharCardFailed] = useState(false)
  const [panNumber, setPanNumber] = useState<string | null>(null)
  const [panName, setPanName] = useState<string | null>(null)
  const [panDOB, setPanDOB] = useState<string | null>(null)
  const [aadharNumber, setAadharNumber] = useState<string | null>(null)
  const [verificationScore, setVerificationScore] = useState<number | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null)
  const [verificationFlags, setVerificationFlags] = useState<any[]>([])
  
  // Document file refs (only PAN and Aadhaar)
  const panCardInputRef = useRef<HTMLInputElement>(null)
  const aadharCardInputRef = useRef<HTMLInputElement>(null)
  const currentAddressInputRef = useRef<HTMLInputElement>(null)
  const permanentAddressInputRef = useRef<HTMLInputElement>(null)
  const currentAddressAutocompleteRef = useRef<GoogleMapsAutocomplete | null>(null)
  const permanentAddressAutocompleteRef = useRef<GoogleMapsAutocomplete | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    hire_date: '',
    salary: '',
    address: '',
    permanent_address: '',
    status: 'active',
    employee_type: 'Employee',
    emergency_contact_relation: '',
    emergency_contact: '',
    bank_name: '',
    bank_account_no: '',
    bank_ifsc: '',
    bank_account_holder_name: ''
  })

  useEffect(() => {
    if (employee) {
      // Populate form for editing
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || '',
        position: employee.position || '',
        hire_date: employee.hire_date ? employee.hire_date.split('T')[0] : '',
        salary: employee.salary || '',
        address: employee.address || '',
        permanent_address: (employee as any).permanent_address || '',
        status: employee.status || 'active',
        employee_type: employee.employee_type || 'Employee',
        emergency_contact_relation: (employee as any).emergency_contact_relation || '',
        emergency_contact: (employee as any).emergency_contact || '',
        bank_name: employee.bank_name || '',
        bank_account_no: employee.bank_account_no || '',
        bank_ifsc: employee.bank_ifsc || '',
        bank_account_holder_name: (employee as any).bank_account_holder_name || ''
      })
      // Set photo preview if employee has a photo
      if (employee.profile_photo) {
        setPhotoPreview(employee.profile_photo)
      } else {
        setPhotoPreview(null)
      }
      // Bank details are now manually entered, no verification needed
      if (employee.pan_verified) {
        setPanCardVerified(true)
        setPanNumber(employee.pan_number || null)
      }
      if (employee.aadhar_verified) {
        setAadharCardVerified(true)
        setAadharNumber(employee.aadhar_number || null)
      }
    } else {
      // Reset form for new employee
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        hire_date: '',
        salary: '',
        address: '',
        permanent_address: '',
        status: 'active',
        employee_type: 'Employee',
        emergency_contact_relation: '',
        emergency_contact: '',
        bank_name: '',
        bank_account_no: '',
        bank_ifsc: '',
        bank_account_holder_name: ''
      })
      setPhotoPreview(null)
      setPhotoFile(null)
      setPanCardFile(null)
      setAadharCardFile(null)
      setPanCardVerifying(false)
      setAadharCardVerifying(false)
      setPanCardVerified(false)
      setAadharCardVerified(false)
      setPanCardFailed(false)
      setAadharCardFailed(false)
      setPanNumber(null)
      setAadharNumber(null)
    }
  }, [employee, isOpen])

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    if (!isOpen) return

    // Load Google Maps script if not already loaded
    const loadGoogleMapsScript = () => {
      return new Promise<void>((resolve, reject) => {
        // Check if script is already loaded
        if (window.google && window.google.maps && window.google.maps.places) {
          resolve()
          return
        }

        // Check if script tag already exists
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement
        if (existingScript) {
          // Poll for Google Maps to be available
          let attempts = 0
          const maxAttempts = 50 // 5 seconds max wait
          const checkInterval = setInterval(() => {
            attempts++
            if (window.google && window.google.maps && window.google.maps.places) {
              clearInterval(checkInterval)
              resolve()
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              reject(new Error('Google Maps script loaded but API not available after timeout'))
            }
          }, 100)
          return
        }

        // Create and load script
        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
        script.async = true
        script.defer = true
        
        // Poll for Google Maps to be available after script loads
        script.onload = () => {
          let attempts = 0
          const maxAttempts = 50 // 5 seconds max wait
          const checkInterval = setInterval(() => {
            attempts++
            if (window.google && window.google.maps && window.google.maps.places) {
              clearInterval(checkInterval)
              resolve()
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval)
              reject(new Error('Google Maps API not available after script load'))
            }
          }, 100)
        }
        
        script.onerror = (error) => {
          console.error('❌ Google Maps script failed to load:', error)
          reject(new Error('Failed to load Google Maps script. Please check your API key restrictions in Google Cloud Console.'))
        }
        
        document.head.appendChild(script)
      })
    }

    // Initialize autocomplete after script loads
    const initAutocomplete = async () => {
      try {
        console.log('🔄 Starting Google Maps Autocomplete initialization...')
        await loadGoogleMapsScript()
        console.log('✅ Google Maps script loaded')
        
        // Wait a bit more to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 300))

        if (!window.google || !window.google.maps || !window.google.maps.places) {
          console.error('❌ Google Maps API not available', {
            hasGoogle: !!window.google,
            hasMaps: !!(window.google?.maps),
            hasPlaces: !!(window.google?.maps?.places)
          })
          
          // Check for API key restriction errors
          const errorMessage = 'Google Maps API key has referrer restrictions. Please update your API key in Google Cloud Console to allow localhost:5173'
          console.error('❌', errorMessage)
          console.error('📝 To fix: Go to Google Cloud Console > APIs & Services > Credentials > Your API Key > Application restrictions > Add http://localhost:5173/*')
          return
        }

        const Autocomplete = window.google.maps.places.Autocomplete

        // Initialize Current Address autocomplete
        if (currentAddressInputRef.current) {
          // Clear previous autocomplete if exists
          if (currentAddressAutocompleteRef.current && window.google.maps.event) {
            window.google.maps.event.clearInstanceListeners(currentAddressAutocompleteRef.current)
            currentAddressAutocompleteRef.current = null
          }

          const currentAutocomplete = new Autocomplete(currentAddressInputRef.current, {
            types: ['geocode'],
            fields: ['formatted_address', 'address_components', 'geometry', 'name']
          })

          currentAddressAutocompleteRef.current = currentAutocomplete

          currentAutocomplete.addListener('place_changed', () => {
            const place = currentAutocomplete.getPlace()
            const placeResult = place as GoogleMapsPlaceResult & { name?: string }
            let address = placeResult.formatted_address || ''
            if (!address && placeResult.name) {
              address = placeResult.name
            }
            if (address) {
              setFormData((prev) => ({ ...prev, address }))
            }
          })
        }

        // Initialize Permanent Address autocomplete
        if (permanentAddressInputRef.current) {
          // Clear previous autocomplete if exists
          if (permanentAddressAutocompleteRef.current && window.google.maps.event) {
            window.google.maps.event.clearInstanceListeners(permanentAddressAutocompleteRef.current)
            permanentAddressAutocompleteRef.current = null
          }

          const permanentAutocomplete = new Autocomplete(permanentAddressInputRef.current, {
            types: ['geocode'],
            fields: ['formatted_address', 'address_components', 'geometry', 'name']
          })

          permanentAddressAutocompleteRef.current = permanentAutocomplete

          permanentAutocomplete.addListener('place_changed', () => {
            const place = permanentAutocomplete.getPlace()
            const placeResult = place as GoogleMapsPlaceResult & { name?: string }
            let address = placeResult.formatted_address || ''
            if (!address && placeResult.name) {
              address = placeResult.name
            }
            if (address) {
              setFormData((prev) => ({ ...prev, permanent_address: address }))
            }
          })
        }

        console.log('✅ Google Maps Autocomplete initialized successfully')
      } catch (error) {
        console.error('❌ Error loading Google Maps:', error)
      }
    }

    // Initialize autocomplete when modal opens
    initAutocomplete()

    return () => {
      // Clean up autocompletes on unmount
      if (currentAddressAutocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(currentAddressAutocompleteRef.current)
        currentAddressAutocompleteRef.current = null
      }
      if (permanentAddressAutocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(permanentAddressAutocompleteRef.current)
        permanentAddressAutocompleteRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        return
      }
      setPhotoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setError('')
    }
  }

  const handleRemovePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDocumentChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    documentType: 'pan' | 'aadhar'
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type (PDF or image)
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf'
      if (!isValidType) {
        setError('Please select a PDF or image file')
        return
      }
      // Validate file size (10MB max for documents)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      setFile(file)
      setError('')

      // Reset verification states
      if (documentType === 'pan') {
        setPanCardVerifying(true)
        setPanCardVerified(false)
        setPanCardFailed(false)
        setPanNumber(null)
      } else if (documentType === 'aadhar') {
        setAadharCardVerifying(true)
        setAadharCardVerified(false)
        setAadharCardFailed(false)
        setAadharNumber(null)
      }

      // Verify immediately (works for both new and existing employees)
      if (token) {
        try {
          if (documentType === 'pan') {
            if (employee) {
              const result = await apiService.uploadPanCard(employee.id, file, token)
              setPanCardVerifying(false)
              if (result.ocrResult?.verified) {
                setPanCardVerified(true)
                setPanCardFailed(false)
                setPanNumber(result.ocrResult.extractedData.panNumber)
                setPanName(result.ocrResult.extractedData.name || null)
                setPanDOB(result.ocrResult.extractedData.dob || null)
                if (result.employee) {
                  setVerificationScore(result.employee.verification_score)
                  setVerificationStatus(result.employee.verification_status)
                  setVerificationFlags(result.employee.verification_flags || [])
                }
              } else {
                setPanCardVerified(false)
                setPanCardFailed(true)
              }
            } else {
              const result = await apiService.verifyPanCard(file, token)
              setPanCardVerifying(false)
              
              // Extract data
              const panNumber = result.extractedData?.panNumber || null
              const panName = result.extractedData?.name || null
              
              setPanNumber(panNumber)
              setPanName(panName)
              setPanDOB(result.extractedData?.dob || null)
              
              // Check name matching with employee name - this is the main verification
              if (panName && formData.first_name && formData.last_name) {
                const employeeFullName = `${formData.first_name} ${formData.last_name}`.trim().toUpperCase()
                const panNameUpper = panName.trim().toUpperCase()
                
                // Name matching logic
                let matchScore = 0
                let matched = false
                
                if (employeeFullName === panNameUpper) {
                  matchScore = 100
                  matched = true
                } else if (employeeFullName.includes(panNameUpper) || panNameUpper.includes(employeeFullName)) {
                  matchScore = 80
                  matched = true
                } else {
                  // Check word-by-word matching
                  const employeeWords = employeeFullName.split(' ').filter((w: string) => w.length > 2)
                  const panWords = panNameUpper.split(' ').filter((w: string) => w.length > 2)
                  let matchingWords = 0
                  
                  for (const empWord of employeeWords) {
                    for (const panWord of panWords) {
                      if (empWord === panWord || empWord.includes(panWord) || panWord.includes(empWord)) {
                        matchingWords++
                        break
                      }
                    }
                  }
                  
                  matchScore = (matchingWords / Math.max(employeeWords.length, panWords.length)) * 100
                  matched = matchScore >= 60
                }
                
                // Show green tick only if name matches AND we have PAN number
                if (matched && panNumber) {
                  setPanCardVerified(true)
                  setPanCardFailed(false)
                } else {
                  setPanCardVerified(false)
                  setPanCardFailed(true)
                }
              } else {
                // No name to match - verify based on PAN number only
                if (panNumber) {
                  setPanCardVerified(true)
                  setPanCardFailed(false)
                } else {
                  setPanCardVerified(false)
                  setPanCardFailed(true)
                }
              }
            }
          } else if (documentType === 'aadhar') {
            if (employee) {
              const result = await apiService.uploadAadharCard(employee.id, file, token)
              setAadharCardVerifying(false)
              if (result.ocrResult?.verified) {
                setAadharCardVerified(true)
                setAadharCardFailed(false)
                setAadharNumber(result.ocrResult.extractedData.aadharNumber)
                if (result.employee) {
                  setVerificationScore(result.employee.verification_score)
                  setVerificationStatus(result.employee.verification_status)
                  setVerificationFlags(result.employee.verification_flags || [])
                }
              } else {
                setAadharCardVerified(false)
                setAadharCardFailed(true)
              }
            } else {
              const result = await apiService.verifyAadharCard(file, token)
              setAadharCardVerifying(false)
              
              // Extract data
              const aadharNumber = result.extractedData?.aadharNumber || null
              
              setAadharNumber(aadharNumber)
              
              // Simple verification: Show green tick if Aadhaar number is extracted
              if (aadharNumber && aadharNumber.length === 12) {
                setAadharCardVerified(true)
                setAadharCardFailed(false)
              } else {
                // No Aadhaar number extracted - show red X
                setAadharCardVerified(false)
                setAadharCardFailed(true)
              }
            }
          }
        } catch (error: any) {
          console.error(`Error verifying ${documentType}:`, error)
          if (documentType === 'pan') {
            setPanCardVerifying(false)
            setPanCardFailed(true)
            setPanNumber(null)
            setPanName(null)
            setPanDOB(null)
          }
          if (documentType === 'aadhar') {
            setAadharCardVerifying(false)
            setAadharCardFailed(true)
            setAadharNumber(null)
          }
          // Show user-friendly error message
          const errorMessage = error?.message || 'Please try again with a clear image'
          if (errorMessage.includes('Cannot connect to server') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
            setError(`Backend server is not running. Please start the backend server on port 5002.`)
          } else {
            setError(`${documentType === 'pan' ? 'PAN' : 'Aadhaar'} verification failed: ${errorMessage}`)
          }
        }
      }
    }
  }

  const handleRemoveDocument = (
    setFile: (file: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    setFile(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Authentication required')
      return
    }

    if (!formData.first_name || !formData.last_name || !formData.email) {
      setError('First Name, Last Name, and Email are required')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Prepare data for API - convert empty strings to undefined and format salary
      const employeeData = {
        ...formData,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
        position: formData.position || undefined,
        hire_date: formData.hire_date || undefined,
        salary: formData.salary ? parseFloat(formData.salary) : undefined,
        address: formData.address || undefined,
        permanent_address: formData.permanent_address || undefined,
        bank_name: formData.bank_name || undefined,
        bank_account_no: formData.bank_account_no || undefined,
        bank_ifsc: formData.bank_ifsc || undefined,
        bank_account_holder_name: formData.bank_account_holder_name || undefined,
      }

      console.log('📤 Creating employee with data:', employeeData)

      let savedEmployee
      if (employee) {
        // Update existing employee
        savedEmployee = await apiService.updateEmployee(employee.id, employeeData, token)
      } else {
        // Create new employee
        savedEmployee = await apiService.createEmployee(employeeData, token)
      }

      // Upload photo if a new photo was selected (for both new and existing employees)
      if (photoFile && savedEmployee) {
        try {
          await apiService.uploadEmployeePhoto(savedEmployee.id, photoFile, token)
          // Refresh employee data to get updated photo URL
          const updatedEmployee = await apiService.getEmployee(savedEmployee.id, token)
          savedEmployee = updatedEmployee
        } catch (photoError: any) {
          console.error('Photo upload error:', photoError)
          // Don't fail the whole operation if photo upload fails
          setError('Employee saved but photo upload failed: ' + (photoError?.message || 'Unknown error'))
        }
      }

      // Upload documents if provided (only if not already uploaded during editing)
      const uploadErrors: string[] = []

      if (panCardFile && savedEmployee && !employee) {
        try {
          setPanCardVerifying(true)
          setPanCardVerified(false)
          setPanCardFailed(false)
          const result = await apiService.uploadPanCard(savedEmployee.id, panCardFile, token)
          setPanCardVerifying(false)
          if (result.ocrResult?.verified) {
            setPanCardVerified(true)
            setPanCardFailed(false)
            setPanNumber(result.ocrResult.extractedData.panNumber)
          } else {
            setPanCardVerified(false)
            setPanCardFailed(true)
          }
        } catch (error: any) {
          console.error('PAN card upload error:', error)
          setPanCardVerifying(false)
          setPanCardFailed(true)
          uploadErrors.push('PAN card: ' + (error?.message || 'Upload failed'))
        }
      }

      if (aadharCardFile && savedEmployee && !employee) {
        try {
          setAadharCardVerifying(true)
          setAadharCardVerified(false)
          setAadharCardFailed(false)
          const result = await apiService.uploadAadharCard(savedEmployee.id, aadharCardFile, token)
          setAadharCardVerifying(false)
          if (result.ocrResult?.verified) {
            setAadharCardVerified(true)
            setAadharCardFailed(false)
            setAadharNumber(result.ocrResult.extractedData.aadharNumber)
          } else {
            setAadharCardVerified(false)
            setAadharCardFailed(true)
          }
        } catch (error: any) {
          console.error('Aadhar card upload error:', error)
          setAadharCardVerifying(false)
          setAadharCardFailed(true)
          uploadErrors.push('Aadhar card: ' + (error?.message || 'Upload failed'))
        }
      }

      if (uploadErrors.length > 0) {
        setError('Employee saved but some document uploads failed: ' + uploadErrors.join(', '))
        // Still close the modal and refresh, but show the error
        setTimeout(() => {
          onSuccess()
          onClose()
        }, 2000)
      } else {
      onSuccess()
      onClose()
      }
    } catch (err: any) {
      console.error('❌ Error saving employee:', err)
      console.error('❌ Error details:', {
        message: err?.message,
        response: err?.response,
        stack: err?.stack
      })
      
      // Extract error message
      let errorMessage = 'Failed to save employee'
      if (err?.message) {
        errorMessage = err.message
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto m-2 sm:m-4">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 flex items-center justify-between z-50">
          <h2 className="text-lg sm:text-xl font-bold truncate pr-2">{employee ? 'Edit Employee' : 'Add New Employee'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Photo Upload Section */}
          <div className="flex flex-col items-center gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Profile preview"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center border-4 border-gray-300 dark:border-gray-600 shadow-lg">
                  <User size={48} className="text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-lg cursor-pointer text-sm"
              >
                <Upload size={14} />
                <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
              </label>
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG or GIF (max 5MB)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">First Name *</label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="John"
                className="placeholder:opacity-40"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Last Name *</label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Doe"
                className="placeholder:opacity-40"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john.doe@company.com"
                className="placeholder:opacity-40"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Phone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 234 567 8900"
                className="placeholder:opacity-40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Emergency Contact Relation</label>
              <Input
                type="text"
                value={formData.emergency_contact_relation}
                onChange={(e) => setFormData({ ...formData, emergency_contact_relation: e.target.value })}
                placeholder="e.g., Father, Mother, Spouse"
                className="placeholder:opacity-40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Emergency Contact</label>
              <Input
                type="tel"
                value={formData.emergency_contact}
                onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                placeholder="+1 234 567 8900"
                className="placeholder:opacity-40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Employee Type *</label>
              <select
                value={formData.employee_type}
                onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600"
                required
              >
                {employeeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white dark:bg-gray-700 dark:border-gray-600"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Position</label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g., Software Engineer"
                className="placeholder:opacity-40"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Hire Date</label>
              <Input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Salary</label>
              <Input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="50000"
                className="placeholder:opacity-40"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
              <label className="block text-sm font-medium mb-2">Current Address</label>
            <Input
                ref={currentAddressInputRef}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Add address"
                className="placeholder:opacity-40"
                autoComplete="off"
                id="current-address-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Permanent Address</label>
              <Input
                ref={permanentAddressInputRef}
                value={formData.permanent_address}
                onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                placeholder="Add address"
                className="placeholder:opacity-40"
                autoComplete="off"
                id="permanent-address-input"
              />
            </div>
          </div>

          {/* Document Uploads Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold mb-4">Documents</h3>
            
            {/* Bank Details - Manual Entry */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <CreditCard size={16} />
                Bank Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Bank Name</label>
                  <Input
                    type="text"
                    placeholder="Enter bank name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="placeholder:opacity-40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Account Number</label>
                  <Input
                    type="text"
                    placeholder="Enter account number"
                    value={formData.bank_account_no}
                    onChange={(e) => setFormData({ ...formData, bank_account_no: e.target.value })}
                    className="placeholder:opacity-40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">IFSC Code</label>
                  <Input
                    type="text"
                    placeholder="Enter IFSC code"
                    value={formData.bank_ifsc}
                    onChange={(e) => setFormData({ ...formData, bank_ifsc: e.target.value.toUpperCase() })}
                    className="placeholder:opacity-40"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground">Account Holder Name</label>
                  <Input
                    type="text"
                    placeholder="Enter account holder name"
                    value={formData.bank_account_holder_name}
                    onChange={(e) => setFormData({ ...formData, bank_account_holder_name: e.target.value })}
                    className="placeholder:opacity-40"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* PAN Card Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">PAN Card</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={panCardInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleDocumentChange(e, setPanCardFile, 'pan')}
                    className="hidden"
                    id="pan-card-upload"
                  />
                  <label
                    htmlFor="pan-card-upload"
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-1"
                  >
                    <Receipt size={14} />
                    <span className="truncate">
                      {panCardFile ? panCardFile.name : 'Upload'}
                    </span>
                  </label>
                  {panCardVerifying && (
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                  )}
                  {!panCardVerifying && panCardVerified && (
                    <CheckCircle2 size={16} className="text-green-500" />
                  )}
                  {!panCardVerifying && panCardFailed && (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  {panCardFile && !panCardVerifying && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        handleRemoveDocument(setPanCardFile, panCardInputRef)
                        setPanCardVerified(false)
                        setPanCardFailed(false)
                        setPanNumber(null)
                      }}
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
                {panCardVerifying && (
                  <p className="text-xs text-blue-500">Verifying with OCR...</p>
                )}
                {!panCardVerifying && panCardVerified && panNumber && (
                  <div className="text-xs space-y-1">
                    <p className="text-green-500 font-medium">✓ Verified</p>
                    <p className="text-muted-foreground">PAN: {panNumber}</p>
                    {panName && <p className="text-muted-foreground">Name: {panName}</p>}
                    {panDOB && <p className="text-muted-foreground">DOB: {panDOB}</p>}
                  </div>
                )}
                {!panCardVerifying && panCardFailed && (
                  <p className="text-xs text-red-500">✗ Invalid document - Could not verify PAN</p>
                )}
                {!panCardVerifying && !panCardVerified && !panCardFailed && (
                  <p className="text-xs text-muted-foreground">PDF or Image (max 10MB)</p>
                )}
              </div>

              {/* Aadhar Card Upload */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-muted-foreground">Aadhar Card</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={aadharCardInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => handleDocumentChange(e, setAadharCardFile, 'aadhar')}
                    className="hidden"
                    id="aadhar-card-upload"
                  />
                  <label
                    htmlFor="aadhar-card-upload"
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-1"
                  >
                    <FileText size={14} />
                    <span className="truncate">
                      {aadharCardFile ? aadharCardFile.name : 'Upload'}
                    </span>
                  </label>
                  {aadharCardVerifying && (
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                  )}
                  {!aadharCardVerifying && aadharCardVerified && (
                    <CheckCircle2 size={16} className="text-green-500" />
                  )}
                  {!aadharCardVerifying && aadharCardFailed && (
                    <XCircle size={16} className="text-red-500" />
                  )}
                  {aadharCardFile && !aadharCardVerifying && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        handleRemoveDocument(setAadharCardFile, aadharCardInputRef)
                        setAadharCardVerified(false)
                        setAadharCardFailed(false)
                        setAadharNumber(null)
                      }}
                    >
                      <X size={14} />
                    </Button>
                  )}
                </div>
                {aadharCardVerifying && (
                  <p className="text-xs text-blue-500">Verifying with OCR...</p>
                )}
                {!aadharCardVerifying && aadharCardVerified && aadharNumber && (
                  <div className="text-xs space-y-1">
                    <p className="text-green-500 font-medium">✓ Document uploaded successfully</p>
                    <p className="text-muted-foreground">Aadhar Number: {aadharNumber}</p>
                  </div>
                )}
                {!aadharCardVerifying && aadharCardFailed && (
                  <p className="text-xs text-red-500">✗ Invalid document - Could not verify Aadhar</p>
                )}
                {!aadharCardVerifying && !aadharCardVerified && !aadharCardFailed && (
                  <p className="text-xs text-muted-foreground">PDF or Image (max 10MB)</p>
                )}
              </div>
            </div>
          </div>

          {/* Verification Status Section */}
          {(verificationScore !== null || verificationStatus) && employee && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold mb-4">Document Verification Status</h3>
              
              <div className="space-y-3">
                {/* Verification Score */}
                {verificationScore !== null && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">Verification Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            verificationScore >= 80
                              ? 'bg-green-500'
                              : verificationScore >= 60
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${verificationScore}%` }}
                        />
                      </div>
                      <span className={`text-sm font-semibold ${
                        verificationScore >= 80
                          ? 'text-green-600 dark:text-green-400'
                          : verificationScore >= 60
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {verificationScore}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Verification Status */}
                {verificationStatus && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">Status</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      verificationStatus === 'approved'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : verificationStatus === 'review_required'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : verificationStatus === 'rejected'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {verificationStatus === 'approved' ? '✓ Approved' :
                       verificationStatus === 'review_required' ? '⚠ Review Required' :
                       verificationStatus === 'rejected' ? '✗ Rejected' :
                       '⏳ Pending'}
                    </span>
                  </div>
                )}

                {/* Verification Flags */}
                {verificationFlags && verificationFlags.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Verification Flags:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {verificationFlags.map((flag: any, index: number) => (
                        <div
                          key={index}
                          className={`text-xs p-2 rounded ${
                            flag.severity === 'high'
                              ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                              : flag.severity === 'medium'
                              ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          }`}
                        >
                          <span className="font-medium">
                            {flag.severity === 'high' ? '🔴' : flag.severity === 'medium' ? '🟡' : '🔵'} 
                          </span>
                          {' '}
                          {flag.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
