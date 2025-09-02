
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
    <div className="p-2">
      <Select value={currentRole} onValueChange={onRoleChange}>
        <SelectTrigger>
            <div className="flex items-center">
                {roleConfig[currentRole].icon}
                <SelectValue placeholder={getRoleLabel(currentRole)} />
            </div>
        </SelectTrigger>
        <SelectContent>
            {Object.entries(roleConfig).map(([role, {label, icon}]) => (
                 <SelectItem key={role} value={role}>
                    <div className="flex items-center">
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
