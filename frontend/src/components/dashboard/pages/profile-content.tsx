/**
 * Profile Content Component (Client Component)
 * User profile display and management
 */

"use client";

import Image from "next/image";
import { useAuth } from "@/features/auth/use-auth";

export function ProfileContent() {
  const { user } = useAuth();

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

      <div className="bg-[#2F2F2F] rounded-xl p-8 max-w-2xl">
        {/* Profile Image */}
        <div className="flex items-center gap-6 mb-8">
          {user?.picture ? (
            <Image
              src={user.picture}
              alt={user.name}
              width={96}
              height={96}
              className="rounded-full"
            />
          ) : (
            <div className="w-24 h-24 bg-gray-500 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-white">
              {user?.name || "User"}
            </h2>
            <p className="text-gray-400">{user?.email || "user@example.com"}</p>
          </div>
        </div>

        {/* Profile Information */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Full Name
            </label>
            <div className="bg-[#191919] text-white px-4 py-3 rounded-lg">
              {user?.name || "N/A"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Email Address
            </label>
            <div className="bg-[#191919] text-white px-4 py-3 rounded-lg">
              {user?.email || "N/A"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Account Type
            </label>
            <div className="bg-[#191919] text-white px-4 py-3 rounded-lg">
              Free Plan
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Member Since
            </label>
            <div className="bg-[#191919] text-white px-4 py-3 rounded-lg">
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-6 border-t border-[#3C3C3C]">
          <button
            className="w-full bg-[#6B7B3E] hover:bg-[#7A8A4D] text-white font-medium py-3 px-4 rounded-lg transition-colors"
            onClick={() => alert("Edit profile feature coming soon!")}
          >
            Edit Profile
          </button>
        </div>
      </div>
    </main>
  );
}
