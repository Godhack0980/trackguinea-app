
"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User, Shield, Truck, Building } from "lucide-react"

type Role = 'client' | 'transporter' | 'admin' | 'client-company' | 'transporter-company';

interface RoleSwitcherProps {
  currentRole: Role;
  onRoleChange: (newRole: Role) => void;
}

const roleConfig = {
    client: { label: "Espace Client", icon: <User className="mr-2 h-4 w-4"/> },
    'client-company': { label: "Espace Client Pro", icon: <Building className="mr-2 h-4 w-4"/> },
    transporter: { label: "Espace Transporteur", icon: <Truck className="mr-2 h-4 w-4"/> },
    'transporter-company': { label: "Espace Transporteur Pro", icon: <Building className="mr-2 h-4 w-4"/> },
    admin: { label: "Espace Admin", icon: <Shield className="mr-2 h-4 w-4"/> }
}

export default function RoleSwitcher({ currentRole, onRoleChange }: RoleSwitcherProps) {
  if (!currentRole) {
    return null; // Don't render anything if the role is not yet defined
  }
  
  const getRoleLabel = (role: Role) => {
    // a bit of a hack to ensure the right label is shown for the select value
    if (role.endsWith('-company')) {
        return roleConfig[role].label;
    }
    return roleConfig[role]?.label || "Select a role";
  }


  return (
    <div className="p-1">
      <Select value={currentRole} onValueChange={onRoleChange}>
        <SelectTrigger className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 focus:ring-0 focus:ring-offset-0">
          <div className="flex items-center text-white">
            {roleConfig[currentRole].icon}
            <SelectValue placeholder={getRoleLabel(currentRole)} />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-[#1b1f2e] border-white/10 text-white">
          {Object.entries(roleConfig).map(([role, {label, icon}]) => (
            <SelectItem 
              key={role} 
              value={role} 
              className="text-white/80 focus:bg-white/10 focus:text-white cursor-pointer hover:bg-white/5"
            >
              <div className="flex items-center text-white">
                {icon}
                <span>{label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
