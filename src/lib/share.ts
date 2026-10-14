import type { GenOptions } from './gen/types';

export interface SharePayload {
	seed: string;
	genre: string;
	planet: string;
	template: string;
	cells: number;
	states: number;
	cultures?: number;
	religions?: number;
	burgs?: number;
	width: number;
	height: number;
	depth?: number;
	sky?: boolean;
	sea?: boolean;
	climate?: {
		tEq: number;
		tN: number;
		tS: number;
		prec?: number;
		precip?: number;
	};
}

/** Encode settings to a URL-safe base64 hash parameter */
export function encodeSharePayload(payload: SharePayload): string {
	try {
		const json = JSON.stringify(payload);
		const bytes = new TextEncoder().encode(json);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	} catch {
		return '';
	}
}

/** Decode settings from a URL-safe base64 hash parameter */
export function decodeSharePayload(hash: string): SharePayload | null {
	try {
		const clean = hash.replace(/^#/, '').replace(/^share=/, '').trim();
		if (!clean) return null;
		let base64 = clean.replace(/-/g, '+').replace(/_/g, '/');
		while (base64.length % 4) base64 += '=';
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		const json = new TextDecoder().decode(bytes);
		return JSON.parse(json) as SharePayload;
	} catch {
		return null;
	}
}

/** Generate a full shareable URL containing the current universe configuration */
export function getShareUrl(payload: SharePayload): string {
	if (typeof window === 'undefined') return '';
	const encoded = encodeSharePayload(payload);
	const url = new URL(window.location.href);
	url.hash = `share=${encoded}`;
	return url.toString();
}
