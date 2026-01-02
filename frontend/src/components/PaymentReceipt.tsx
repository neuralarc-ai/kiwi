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
    if (amount === undefined || amount === null || amount === '') return '₹0.00'
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    // Check if it's a valid number
    if (isNaN(numAmount) || !isFinite(numAmount)) return '₹0.00'
    return `₹${numAmount.toFixed(2)}`
  }

  const getMonthName = (month: number | undefined) => {
    if (!month) return ''
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    return months[month - 1]
  }

  const generatePDF = () => {
    if (!receiptRef.current) return

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const margin = 20
    const contentWidth = pageWidth - 2 * margin
    let yPos = margin
    
    // ALWAYS use employee salary as source of truth for basic salary (for PDF)
    // Always prioritize employee salary - it's the source of truth
    const employeeSalary = parseFloat(String((payroll as any).salary || 0)) || 0
    const payrollBasicSalary = parseFloat(String(payroll.basic_salary || 0)) || 0
    // Only use payroll basic_salary if employee salary is 0 or not available
    const actualBasicSalary = employeeSalary > 0 ? employeeSalary : payrollBasicSalary
    const allowances = parseFloat(String(payroll.allowances || 0)) || 0
    
    // ALWAYS calculate TDS as 10% of gross salary (don't trust stored value)
    const grossSalary = actualBasicSalary + allowances
    const tdsAmount = grossSalary * 0.10
    
    // Calculate leave deduction - use stored value (it's calculated by backend)
    const leaveDeductionAmount = parseFloat(String(payroll.leave_deduction || 0)) || 0
    
    // Calculate other deductions correctly
    const storedTotalDeductions = parseFloat(String(payroll.deductions || 0)) || 0
    const storedTDS = parseFloat(String(payroll.tds || 0)) || 0
    const storedLeaveDeduction = parseFloat(String(payroll.leave_deduction || 0)) || 0
    
    // Calculate other deductions: stored total - (stored TDS + stored leave deduction)
    // But if stored total is suspiciously large, assume other deductions are 0
    let otherDeductions = 0
    if (storedTotalDeductions > 0 && storedTotalDeductions < grossSalary) {
      // Only use stored deductions if it's reasonable (less than gross salary)
      otherDeductions = Math.max(0, storedTotalDeductions - storedTDS - storedLeaveDeduction)
    } else {
      // If stored deductions is wrong (too large or negative), set other deductions to 0
      otherDeductions = 0
    }
    
    // Recalculate total deductions from scratch (TDS + Leave + Other)
    const totalDeductions = tdsAmount + leaveDeductionAmount + otherDeductions
    const netSalary = grossSalary - totalDeductions

    // Helper function to add text with word wrap
    const addText = (text: string, x: number, y: number, fontSize: number = 12, align: 'left' | 'center' | 'right' = 'left', maxWidth?: number) => {
      pdf.setFontSize(fontSize)
      const lines = pdf.splitTextToSize(text, maxWidth || contentWidth)
      pdf.text(lines, x, y, { align })
      return lines.length * (fontSize * 0.4) + 2
    }

    // Company Header
    pdf.setFontSize(20)
    pdf.setFont('helvetica', 'bold')
    pdf.text('PAYMENT RECEIPT', pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'normal')
    //pdf.text('HR Management System', pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Receipt Details
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')
    const receiptDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
    pdf.text(`Date: ${receiptDate}`, margin, yPos)
    yPos += 8

    const receiptNumber = `REC-${payroll.year}-${String(payroll.month || 0).padStart(2, '0')}-${payroll.employee_id}`
    pdf.text(`Receipt No: ${receiptNumber}`, margin, yPos)
    yPos += 15

    // Employee Information
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Employee Information', margin, yPos)
    yPos += 8

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    yPos += addText(`Name: ${employeeName}`, margin, yPos, 11)
    if (payroll.emp_id) {
      yPos += addText(`Employee ID: ${payroll.emp_id}`, margin, yPos, 11)
    }
    if (payroll.department) {
      yPos += addText(`Department: ${payroll.department}`, margin, yPos, 11)
    }
    if (payroll.position) {
      yPos += addText(`Position: ${payroll.position}`, margin, yPos, 11)
    }
    yPos += 10

    // Payment Period
    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')
    const paymentPeriod = `${getMonthName(payroll.month)} ${payroll.year}`
    yPos += addText(`Payment Period: ${paymentPeriod}`, margin, yPos, 11)
    yPos += 15

    // Salary Breakdown
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Salary Breakdown', margin, yPos)
    yPos += 8

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    // Basic Salary - always use employee salary as source of truth
    pdf.text('Basic Salary:', margin, yPos)
    pdf.text(formatCurrency(actualBasicSalary), pageWidth - margin, yPos, { align: 'right' })
    yPos += 7

    // Allowances - Always show (use calculated value)
    pdf.text('Allowances:', margin, yPos)
    pdf.text(formatCurrency(allowances), pageWidth - margin, yPos, { align: 'right' })
    yPos += 7

    // Gross Salary (Total)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Gross Salary (Total):', margin, yPos)
    pdf.text(formatCurrency(grossSalary), pageWidth - margin, yPos, { align: 'right' })
    yPos += 10

    // Deductions Section
    pdf.setFontSize(14)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Deductions', margin, yPos)
    yPos += 8

    pdf.setFontSize(11)
    pdf.setFont('helvetica', 'normal')

    // TDS - Always show (10% of gross salary) - deducted from basic salary
    pdf.text('TDS (Tax Deducted at Source - 10% of Gross Salary):', margin, yPos)
    pdf.text(formatCurrency(tdsAmount), pageWidth - margin, yPos, { align: 'right' })
    yPos += 7

    // Leave Deduction - Always show (show 0 if no deduction)
    const leaveDeductionLabel = leaveDeductionAmount === 0 
      ? 'Leave Deduction (≤2 leaves - No deduction):' 
      : 'Leave Deduction (More than 2 leaves):'
    pdf.text(leaveDeductionLabel, margin, yPos)
    pdf.text(formatCurrency(leaveDeductionAmount), pageWidth - margin, yPos, { align: 'right' })
    yPos += 7

    // Other Deductions
    if (otherDeductions > 0) {
      pdf.text('Other Deductions:', margin, yPos)
      pdf.text(formatCurrency(otherDeductions), pageWidth - margin, yPos, { align: 'right' })
      yPos += 7
    }

    // Total Deductions
    pdf.setFont('helvetica', 'bold')
    pdf.text('Total Deductions:', margin, yPos)
    pdf.text(formatCurrency(totalDeductions), pageWidth - margin, yPos, { align: 'right' })
    yPos += 10

    // Net Salary
    pdf.setFontSize(16)
    pdf.setFont('helvetica', 'bold')
    pdf.text('Net Salary:', margin, yPos)
    pdf.text(formatCurrency(netSalary), pageWidth - margin, yPos, { align: 'right' })
    yPos += 15

    // Footer - Removed computer-generated text
    // pdf.setFontSize(10)
    // pdf.setFont('helvetica', 'italic')
    // pdf.text('This is a computer-generated receipt.', pageWidth / 2, pageHeight - 20, { align: 'center' })
    // pdf.text('No signature required.', pageWidth / 2, pageHeight - 15, { align: 'center' })

    // Save PDF
    const fileName = `Payment_Receipt_${employeeName.replace(/\s+/g, '_')}_${getMonthName(payroll.month)}_${payroll.year}.pdf`
    pdf.save(fileName)

    if (onDownload) {
      onDownload()
    }
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

  // ALWAYS use employee salary as source of truth for basic salary
  // The salary field from employees table is the correct value (₹20,000)
  // Never use payroll.basic_salary as it might be incorrect (₹19,996)
  const employeeSalary = toNumber((payroll as any).salary)
  const payrollBasicSalary = toNumber(payroll.basic_salary)
  // Always prioritize employee salary - it's the source of truth
  // Only use payroll basic_salary if employee salary is 0 or not available
  const actualBasicSalary = employeeSalary > 0 ? employeeSalary : payrollBasicSalary
  const allowances = toNumber(payroll.allowances)
  const grossSalary = actualBasicSalary + allowances
  
  // ALWAYS calculate TDS as 10% of gross salary (don't trust stored value)
  // This ensures TDS is always correct: 10% of (Basic Salary + Allowances)
  const tdsAmount = grossSalary * 0.10
  
  // Calculate leave deduction - use stored value (it's calculated by backend)
  const leaveDeductionAmount = toNumber(payroll.leave_deduction)
  
  // Calculate other deductions correctly
  // The deductions field in database might contain incorrect data, so we need to extract other deductions
  // If stored deductions is huge, it's likely wrong - recalculate from scratch
  const storedTotalDeductions = toNumber(payroll.deductions)
  const storedTDS = toNumber(payroll.tds)
  const storedLeaveDeduction = toNumber(payroll.leave_deduction)
  
  // Calculate other deductions: stored total - (stored TDS + stored leave deduction)
  // But if stored total is suspiciously large, assume other deductions are 0
  let otherDeductions = 0
  if (storedTotalDeductions > 0 && storedTotalDeductions < grossSalary) {
    // Only use stored deductions if it's reasonable (less than gross salary)
    otherDeductions = Math.max(0, storedTotalDeductions - storedTDS - storedLeaveDeduction)
  } else {
    // If stored deductions is wrong (too large or negative), set other deductions to 0
    otherDeductions = 0
  }
  
  // Recalculate total deductions from scratch (TDS + Leave + Other)
  const totalDeductions = tdsAmount + leaveDeductionAmount + otherDeductions
  
  // Recalculate net salary to ensure accuracy
  const netSalary = grossSalary - totalDeductions
  
  // Debug logging (remove in production)
  console.log('💰 Payslip Calculation:', {
    employeeSalary: (payroll as any).salary,
    payrollBasicSalary: payroll.basic_salary,
    actualBasicSalary,
    allowances,
    grossSalary,
    tdsAmount: `10% of ${grossSalary} = ${tdsAmount}`,
    leaveDeductionAmount,
    otherDeductions,
    totalDeductions: `${tdsAmount} + ${leaveDeductionAmount} + ${otherDeductions} = ${totalDeductions}`,
    netSalary: `${grossSalary} - ${totalDeductions} = ${netSalary}`,
    storedTotalDeductions: `(stored: ${toNumber(payroll.deductions)})`
  })

  return (
    <div className="space-y-4">
      <div ref={receiptRef} className="bg-white dark:bg-gray-800 p-6 rounded-lg border shadow-lg max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <FileText className="text-blue-500" size={24} />
            <h2 className="text-2xl font-bold">Payslip</h2>
          </div>
          <Button onClick={generatePDF} className="flex items-center gap-2 bg-blue-600">
            <Download size={18} />
            Download Payslip
          </Button>
        </div>

        <div className="space-y-6">
          {/* Company Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-3xl font-bold mb-2">PAYMENT RECEIPT</h1>
            <p className="text-muted-foreground">HR Management System</p>
            <p className="text-sm text-muted-foreground mt-2">
              Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-sm text-muted-foreground">
              Receipt No: REC-{payroll.year}-{String(payroll.month || 0).padStart(2, '0')}-{payroll.employee_id}
            </p>
          </div>

          {/* Employee Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Employee Information</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Name:</span> {employeeName}</p>
              {payroll.emp_id && <p><span className="font-medium">Employee ID:</span> {payroll.emp_id}</p>}
              {payroll.department && <p><span className="font-medium">Department:</span> {payroll.department}</p>}
              {payroll.position && <p><span className="font-medium">Position:</span> {payroll.position}</p>}
              <p><span className="font-medium">Payment Period:</span> {getMonthName(payroll.month)} {payroll.year}</p>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Salary Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Basic Salary:</span>
                <span className="font-medium">
                  {formatCurrency(actualBasicSalary)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Allowances:</span>
                <span className="font-medium text-green-600">{formatCurrency(allowances)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Gross Salary (Total):</span>
                <span className="text-black dark:text-white">{formatCurrency(grossSalary)}</span>
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Deductions</h3>
            <div className="space-y-2">
              {/* Always show TDS (10% of gross salary) - deducted from basic salary */}
              <div className="flex justify-between">
                <span>TDS (Tax Deducted at Source - 10% of Gross Salary):</span>
                <span className="font-medium text-red-600">{formatCurrency(tdsAmount)}</span>
              </div>
              {/* Always show leave deduction - show 0 if no deduction (≤2 leaves) */}
              <div className="flex justify-between">
                <span>Leave Deduction {leaveDeductionAmount === 0 ? '(≤2 leaves - No deduction)' : '(More than 2 leaves)'}:</span>
                <span className="font-medium text-red-600">{formatCurrency(leaveDeductionAmount)}</span>
              </div>
              {/* Show other deductions only if they exist */}
              {otherDeductions > 0 && (
                <div className="flex justify-between">
                  <span>Other Deductions:</span>
                  <span className="font-medium text-red-600">{formatCurrency(otherDeductions)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Total Deductions:</span>
                <span className="text-red-600">{formatCurrency(totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Salary */}
          <div className="border-t-2 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">Net Salary:</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(netSalary)}</span>
            </div>
          </div>

          {/* Footer - Removed computer-generated text */}
        </div>
      </div>
    </div>
  )
}

