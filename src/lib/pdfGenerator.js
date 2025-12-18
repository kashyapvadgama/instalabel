import jsPDF from "jspdf";

export const generateLabel = (order) => {
  // 4x6 inch label (Standard shipping size)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [101.6, 152.4] 
  });

  // Border
  doc.setLineWidth(0.5);
  doc.rect(2, 2, 97.6, 148.4);

  // Header (Store Name)
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("INSTALABEL LOGISTICS", 50.8, 10, { align: "center" });
  
  doc.setLineWidth(0.2);
  doc.line(2, 15, 99.6, 15);

  // To Address (Customer)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("DELIVER TO:", 5, 22);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(order.customer_name || "Unknown Name", 5, 28);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  // Text wrapping for address
  const splitAddress = doc.splitTextToSize(order.address || "", 90);
  doc.text(splitAddress, 5, 34);
  
  let currentY = 34 + (splitAddress.length * 5);

  doc.text(`${order.city || ""} - ${order.pincode || ""}`, 5, currentY);
  currentY += 6;
  doc.text(`Phone: +91 ${order.phone || ""}`, 5, currentY);

  // Line Separator
  currentY += 5;
  doc.line(2, currentY, 99.6, currentY);

  // COD / Amount Section
  currentY += 8;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`COD AMOUNT: Rs. ${order.amount || "0"}`, 50.8, currentY, { align: "center" });

  // Order Details
  currentY += 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Order Date: ${new Date().toLocaleDateString()}`, 5, currentY);
  doc.text("Pre-paid / COD", 95, currentY, { align: "right" });

  // Barcode Placeholder (Simple Box)
  currentY += 5;
  doc.rect(10, currentY, 81.6, 20);
  doc.setFontSize(10);
  doc.text("TRACKING BARCODE HERE", 50.8, currentY + 12, { align: "center" });

  // Save the PDF
  doc.save(`label_${order.customer_name}_${Date.now()}.pdf`);
};
