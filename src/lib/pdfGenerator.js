import jsPDF from "jspdf";

export const generateLabel = (order, profile) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [101.6, 152.4] 
  });

  // Border
  doc.setLineWidth(0.5);
  doc.rect(2, 2, 97.6, 148.4);

  // Store Branding
  const senderName = profile?.store_name || "INSTALABEL LOGISTICS";
  const senderAddress = profile?.store_address || "Powered by InstaLabel.in";

  // Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(senderName.toUpperCase(), 50.8, 10, { align: "center" });
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(senderAddress, 50.8, 15, { align: "center" });

  doc.setLineWidth(0.2);
  doc.line(2, 18, 99.6, 18);

  // To Address
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("DELIVER TO:", 5, 25);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(order.customer_name || "Unknown Name", 5, 31);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const splitAddress = doc.splitTextToSize(order.address || "", 90);
  doc.text(splitAddress, 5, 37);
  
  let currentY = 37 + (splitAddress.length * 5);

  doc.text(`${order.city || ""} - ${order.pincode || ""}`, 5, currentY);
  currentY += 6;
  doc.text(`Phone: +91 ${order.phone || ""}`, 5, currentY);

  // Line Separator
  currentY += 5;
  doc.line(2, currentY, 99.6, currentY);

  // 🟢 PAYMENT MODE LOGIC
  currentY += 8;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");

  if (order.payment_mode === 'Prepaid') {
      doc.text("PREPAID ORDER", 50.8, currentY, { align: "center" });
      currentY += 8;
      doc.text("DO NOT COLLECT CASH", 50.8, currentY, { align: "center" });
  } else {
      doc.text(`COD AMOUNT: Rs. ${order.amount || "0"}`, 50.8, currentY, { align: "center" });
  }

  // Order Details
  currentY += 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Order Date: ${new Date().toLocaleDateString()}`, 5, currentY);
  
  // Show actual amount value for reference even if prepaid
  if (order.payment_mode === 'Prepaid') {
      doc.text(`Value: Rs. ${order.amount}`, 95, currentY, { align: "right" });
  } else {
      doc.text("COD", 95, currentY, { align: "right" });
  }
  
  if (order.items) {
      currentY += 5;
      doc.text(`Items: ${order.items.substring(0, 50)}`, 5, currentY);
  }

  doc.save(`label_${order.customer_name}_${Date.now()}.pdf`);
};