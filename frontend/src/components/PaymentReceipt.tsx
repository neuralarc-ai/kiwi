import { useRef } from 'react'
import jsPDF from 'jspdf'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Payroll } from '@/services/api'

interface PaymentReceiptProps {
  payroll: Payroll
  employeeName: string
  onDownload?: () => void
}

// Helper function to convert number to words
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (num === 0) return 'Zero'
  if (num < 20) return ones[num]
  if (num < 100) {
    const ten = Math.floor(num / 10)
    const one = num % 10
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '')
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100)
    const remainder = num % 100
    return ones[hundred] + ' Hundred' + (remainder > 0 ? ' ' + numberToWords(remainder) : '')
  }
  if (num < 100000) {
    const thousand = Math.floor(num / 1000)
    const remainder = num % 1000
    return numberToWords(thousand) + ' Thousand' + (remainder > 0 ? ' ' + numberToWords(remainder) : '')
  }
  if (num < 10000000) {
    const lakh = Math.floor(num / 100000)
    const remainder = num % 100000
    return numberToWords(lakh) + ' Lakh' + (remainder > 0 ? ' ' + numberToWords(remainder) : '')
  }
  const crore = Math.floor(num / 10000000)
  const remainder = num % 10000000
  return numberToWords(crore) + ' Crore' + (remainder > 0 ? ' ' + numberToWords(remainder) : '')
}

export default function PaymentReceipt({ payroll, employeeName, onDownload }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  // Validate payroll data
  if (!payroll) {
    return (
      <div className="p-6 text-center text-red-600">
        <p>Error: No payroll data available</p>
      </div>
    )
  }

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null || amount === '') return '₹0'
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    if (isNaN(numAmount) || !isFinite(numAmount)) return '₹0'
    return `₹${numAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  const getMonthName = (month: number | undefined) => {
    if (!month) return ''
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
  }

  // Helper function to safely convert to number
  const toNumber = (value: any): number => {
    if (typeof value === 'number') return isNaN(value) ? 0 : value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  // Calculate salary components
  const employeeSalary = toNumber((payroll as any).salary)
  const payrollBasicSalary = toNumber(payroll.basic_salary)
  const actualBasicSalary = employeeSalary > 0 ? employeeSalary : payrollBasicSalary
  const allowances = toNumber(payroll.allowances)
  const grossSalary = actualBasicSalary + allowances
  const tdsAmount = grossSalary * 0.10
  const leaveDeductionAmount = toNumber(payroll.leave_deduction)
  const storedTotalDeductions = toNumber(payroll.deductions)
  const storedTDS = toNumber(payroll.tds)
  const storedLeaveDeduction = toNumber(payroll.leave_deduction)
  
  let otherDeductions = 0
  if (storedTotalDeductions > 0 && storedTotalDeductions < grossSalary) {
    otherDeductions = Math.max(0, storedTotalDeductions - storedTDS - storedLeaveDeduction)
  }
  
  const totalDeductions = tdsAmount + leaveDeductionAmount + otherDeductions
  const netSalary = grossSalary - totalDeductions

  // Get working days and leaves (assuming 22 working days per month, can be adjusted)
  const workingDays = 22
  const leavesTaken = Math.floor(leaveDeductionAmount / (grossSalary / workingDays)) || 0
  const totalLeaves = 2
  const excessLeaves = Math.max(0, leavesTaken - totalLeaves)

  // Generate amount in words
  const amountInWords = numberToWords(Math.round(netSalary)) + ' Rupees Only'

  const generatePDF = () => {
    if (!receiptRef.current) return

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 20
    const contentWidth = pageWidth - 2 * margin
    let yPos = margin
    
    // Address in top right
    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Range Hills Road, Pune 411 007', pageWidth - margin, yPos, { align: 'right' })
    yPos += 8

    // PAYMENT ADVICE title
    pdf.setFontSize(24)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PAYMENT ADVICE', pageWidth / 2, yPos, { align: 'center' })
    yPos += 12

    // Black bar with payment period
    pdf.setFillColor(0, 0, 0)
    pdf.rect(margin, yPos - 5, contentWidth, 8, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text(`Payment for ${getMonthName(payroll.month)} ${payroll.year}`, pageWidth / 2, yPos, { align: 'center' })
    pdf.setTextColor(0, 0, 0)
    yPos += 15

    // Employee Details Box
    const boxY = yPos
    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.5)
    pdf.rect(margin, boxY, contentWidth, 35)
    
    // Left column
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Employee Name:', margin + 5, boxY + 8)
    pdf.setFont('helvetica', 'bold')
    pdf.text(employeeName, margin + 50, boxY + 8)
    
    pdf.setFont('helvetica', 'normal')
    pdf.text('Designation:', margin + 5, boxY + 15)
    pdf.text(payroll.position || payroll.department || 'N/A', margin + 50, boxY + 15)
    
    pdf.text('Employee ID:', margin + 5, boxY + 22)
    pdf.text(payroll.emp_id || `EMP${payroll.employee_id}`, margin + 50, boxY + 22)
    
    pdf.text('Agreement Ref:', margin + 5, boxY + 29)
    pdf.text(`NA${String(payroll.month || 0).padStart(2, '0')}${payroll.year}-${payroll.employee_id}`, margin + 50, boxY + 29)
    
    // Right column
    pdf.text('Working Days:', pageWidth / 2 + 10, boxY + 8)
    pdf.text(String(workingDays), pageWidth / 2 + 50, boxY + 8)
    
    pdf.text('Leaves Taken:', pageWidth / 2 + 10, boxY + 15)
    pdf.text(`${leavesTaken} / ${totalLeaves}`, pageWidth / 2 + 50, boxY + 15)
    
    pdf.text('Excess Leaves:', pageWidth / 2 + 10, boxY + 22)
    pdf.text(excessLeaves > 0 ? String(excessLeaves) : '-', pageWidth / 2 + 50, boxY + 22)
    
    yPos = boxY + 40

    // Earnings and Deductions Tables (side by side)
    const tableWidth = (contentWidth - 10) / 2
    const tableY = yPos
    
    // Earnings Table
    pdf.setFillColor(200, 200, 200)
    pdf.rect(margin, tableY, tableWidth, 8, 'F')
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('EARNINGS', margin + tableWidth / 2, tableY + 5, { align: 'center' })
    
    pdf.setFillColor(255, 255, 255)
    pdf.rect(margin, tableY + 8, tableWidth, 10, 'F')
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('Gross Payment', margin + 5, tableY + 14)
    pdf.text(formatCurrency(grossSalary), margin + tableWidth - 5, tableY + 14, { align: 'right' })
    
    // Deductions Table
    pdf.setFillColor(200, 200, 200)
    pdf.rect(margin + tableWidth + 10, tableY, tableWidth, 8, 'F')
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('DEDUCTIONS', margin + tableWidth + 10 + tableWidth / 2, tableY + 5, { align: 'center' })
    
    pdf.setFillColor(255, 255, 255)
    pdf.rect(margin + tableWidth + 10, tableY + 8, tableWidth, 20, 'F')
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text('TDS', margin + tableWidth + 15, tableY + 14)
    pdf.text(formatCurrency(tdsAmount), margin + tableWidth + 10 + tableWidth - 5, tableY + 14, { align: 'right' })
    
    pdf.text('Leave Deduction', margin + tableWidth + 15, tableY + 21)
    pdf.text(formatCurrency(leaveDeductionAmount), margin + tableWidth + 10 + tableWidth - 5, tableY + 21, { align: 'right' })
    
    yPos = tableY + 30

    // Summary section
    pdf.setFillColor(200, 200, 200)
    pdf.rect(margin, yPos, tableWidth, 8, 'F')
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('GROSS PAYMENT', margin + tableWidth / 2, yPos + 5, { align: 'center' })
    
    pdf.setFillColor(255, 255, 255)
    pdf.rect(margin, yPos + 8, tableWidth, 8, 'F')
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(formatCurrency(grossSalary), margin + tableWidth - 5, yPos + 13, { align: 'right' })
    
    pdf.setFillColor(200, 200, 200)
    pdf.rect(margin + tableWidth + 10, yPos, tableWidth, 8, 'F')
    pdf.setTextColor(0, 0, 0)
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'bold')
    pdf.text('TOTAL DEDUCTIONS', margin + tableWidth + 10 + tableWidth / 2, yPos + 5, { align: 'center' })
    
    pdf.setFillColor(255, 255, 255)
    pdf.rect(margin + tableWidth + 10, yPos + 8, tableWidth, 8, 'F')
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    pdf.text(formatCurrency(totalDeductions), margin + tableWidth + 10 + tableWidth - 5, yPos + 13, { align: 'right' })
    
    yPos += 20

    // Net Payment bar
    pdf.setFillColor(0, 0, 0)
    pdf.rect(margin, yPos, contentWidth, 10, 'F')
    pdf.setTextColor(255, 255, 255)
    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    pdf.text('NET PAYMENT', margin + 10, yPos + 7)
    pdf.text(formatCurrency(netSalary), pageWidth - margin - 10, yPos + 7, { align: 'right' })
    pdf.setTextColor(0, 0, 0)
    yPos += 15

    // Amount in words
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    pdf.text(`Amount in Words: ${amountInWords}`, margin, yPos)
    yPos += 20

    // Footer
    pdf.setFontSize(8)
    pdf.setTextColor(150, 150, 150)
    pdf.text('This is a computer generated payment advice and does not require a signature.', pageWidth / 2, pageHeight - 15, { align: 'center' })

    // Save PDF
    const fileName = `Payment_Advice_${employeeName.replace(/\s+/g, '_')}_${getMonthName(payroll.month)}_${payroll.year}.pdf`
    pdf.save(fileName)

    if (onDownload) {
      onDownload()
    }
  }

  return (
    <div className="space-y-4">
      <div ref={receiptRef} className="bg-white dark:bg-gray-800 p-8 rounded-lg border shadow-lg max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold">Payment Advice</h2>
          </div>
          <Button onClick={generatePDF} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
            <Download size={18} />
            Download Payslip
          </Button>
        </div>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-right mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Range Hills Road, Pune 411 007</p>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold mb-4">PAYMENT ADVICE</h1>
            <div className="bg-black text-white py-3 px-6 rounded">
              <p className="text-lg font-bold">Payment for {getMonthName(payroll.month)} {payroll.year}</p>
            </div>
          </div>

          {/* Employee Details Box */}
          <div className="border-2 border-gray-900 dark:border-gray-300 p-4 rounded">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Employee Name: </span>
                  <span className="text-sm font-bold">{employeeName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Designation: </span>
                  <span className="text-sm">{payroll.position || payroll.department || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Employee ID: </span>
                  <span className="text-sm">{payroll.emp_id || `EMP${payroll.employee_id}`}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Agreement Ref: </span>
                  <span className="text-sm">NA{String(payroll.month || 0).padStart(2, '0')}{payroll.year}-{payroll.employee_id}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium">Working Days: </span>
                  <span className="text-sm">{workingDays}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Leaves Taken: </span>
                  <span className="text-sm">{leavesTaken} / {totalLeaves}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Excess Leaves: </span>
                  <span className="text-sm">{excessLeaves > 0 ? excessLeaves : '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions Tables */}
          <div className="grid grid-cols-2 gap-4">
            {/* Earnings */}
            <div>
              <div className="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-t">
                <h3 className="text-sm font-bold text-center">EARNINGS</h3>
              </div>
              <div className="border border-t-0 border-gray-900 dark:border-gray-300 p-4 rounded-b">
                <div className="flex justify-between">
                  <span className="text-sm">Gross Payment</span>
                  <span className="text-sm font-medium">{formatCurrency(grossSalary)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <div className="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-t">
                <h3 className="text-sm font-bold text-center">DEDUCTIONS</h3>
              </div>
              <div className="border border-t-0 border-gray-900 dark:border-gray-300 p-4 rounded-b space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">TDS</span>
                  <span className="text-sm font-medium">{formatCurrency(tdsAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Leave Deduction</span>
                  <span className="text-sm font-medium">{formatCurrency(leaveDeductionAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-t">
                <h3 className="text-sm font-bold text-center">GROSS PAYMENT</h3>
              </div>
              <div className="border border-t-0 border-gray-900 dark:border-gray-300 p-4 rounded-b">
                <div className="flex justify-end">
                  <span className="text-sm font-bold">{formatCurrency(grossSalary)}</span>
                </div>
              </div>
            </div>
            <div>
              <div className="bg-gray-300 dark:bg-gray-600 py-2 px-4 rounded-t">
                <h3 className="text-sm font-bold text-center">TOTAL DEDUCTIONS</h3>
              </div>
              <div className="border border-t-0 border-gray-900 dark:border-gray-300 p-4 rounded-b">
                <div className="flex justify-end">
                  <span className="text-sm font-bold">{formatCurrency(totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Payment */}
          <div className="bg-black text-white py-4 px-6 rounded">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">NET PAYMENT</span>
              <span className="text-lg font-bold">{formatCurrency(netSalary)}</span>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="border-t pt-4">
            <p className="text-sm">
              <span className="font-medium">Amount in Words: </span>
              {amountInWords}
            </p>
          </div>

          {/* Footer */}
          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              This is a computer generated payment advice and does not require a signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
