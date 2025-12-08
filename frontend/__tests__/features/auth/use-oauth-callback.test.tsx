/**
 * useOAuthCallback 훅 테스트
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOAuthCallback } from "@/features/auth/use-oauth-callback";
import { ReactNode } from "react";

