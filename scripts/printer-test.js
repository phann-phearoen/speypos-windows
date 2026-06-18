// const ThermalPrinter = require('node-thermal-printer');
// const PrinterTypes = ThermalPrinter.types;
const pkg = require('node-thermal-printer');
const ThermalPrinter = pkg.printer;
const PrinterTypes = pkg.types;

const printer = new ThermalPrinter({
  type: PrinterTypes.EPSON,
  interface: 'printer:XP-80C',
  width: 80,
  options: {
    timeout: 5000,
  },
});

async function test() {
  console.log("Checking printer connection...");
  const connected = await printer.isPrinterConnected();
  console.log("Printer connected:", connected);

  if (!connected) return;

  printer.alignCenter();
  printer.println("SPEYPOS PRINTER TEST");
  printer.drawLine();
  printer.println("USB001 / XP-80C");
  printer.println(new Date().toISOString());
  printer.drawLine();
  printer.cut();

  await printer.execute();
  console.log("Print job sent.");
}

test().catch(console.error);
