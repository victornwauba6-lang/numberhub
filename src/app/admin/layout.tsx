import AdminNav from "./_components/AdminNav";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f5f8f6]">
      <AdminNav />
      {children}
    </div>
  );
}
