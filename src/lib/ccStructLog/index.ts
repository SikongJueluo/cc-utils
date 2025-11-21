/**
 * Main entry point for the ccStructLog library.
 *
 * This module provides convenient factory functions and pre-configured
 * logger instances for common use cases. It exports all the core components
 * while providing easy-to-use defaults for typical logging scenarios.
 */

// Re-export all core types and classes
export * from "./types";
export * from "./Logger";

// Re-export all processors
export * from "./processors";

// Re-export all renderers
export * from "./renderers";

// Re-export all streams
export * from "./streams";
