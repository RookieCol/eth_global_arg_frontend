import ConnectLedger from "./_components/ConnectLedger";

export default function Navbar() {
  return (
    <div
      className="w-full flex items-center justify-between px-8 py-4 relative"
      style={{ zIndex: 10 }}
    >
      {/* ⚙️ */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-white">Kaleidoscope Router ☄️</h1>
      </div>
      <ConnectLedger />
    </div>
  );
}
