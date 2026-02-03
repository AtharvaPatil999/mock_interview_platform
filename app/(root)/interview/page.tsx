import { Code2, Database, Globe, TestTube } from "lucide-react";
import RoleCard from "@/components/RoleCard";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  const user = await getCurrentUser();

  const predefinedRoles = [
    { role: "Java Developer", icon: <Code2 size={24} /> },
    { role: "Python Developer", icon: <Database size={24} /> },
    { role: "Golang Developer", icon: <Globe size={24} /> },
    { role: "Software Tester", icon: <TestTube size={24} /> },
    { role: "Frontend Developer", icon: <Code2 size={24} /> },
    { role: "Backend Developer", icon: <Database size={24} /> },
    { role: "Fullstack Developer", icon: <Globe size={24} /> },
    { role: "DevOps Engineer", icon: <Globe size={24} /> },
  ];

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 mb-2">
          <Code2 className="text-primary" size={24} />
          <h2 className="text-3xl font-bold">Browse Interview Categories</h2>
        </div>
        <p className="text-gray-400 text-lg">
          Select a role to start a personalized role-based interview session.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
          {predefinedRoles.map((role) => (
            <RoleCard
              key={role.role}
              role={role.role}
              userId={user?.id || ""}
              icon={role.icon}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Page;
