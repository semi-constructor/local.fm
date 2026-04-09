export type User = {
  id: string;
  name: string | null;
  email: string;
  birthday?: Date | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  dashboardPrefs?: any;
  recapPrefs?: any;
  publicId?: string | null;
  image?: string | null;
  isPublicStats?: boolean | null;
  debugMode?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Artist = {
  id: string;
  name: string;
  imageUrl?: string | null;
  spotifyId?: string | null;
  genres: string[];
};

export type Album = {
  id: string;
  name: string;
  imageUrl?: string | null;
  spotifyId?: string | null;
  artistId: string;
};

export type Track = {
  id: string;
  name: string;
  duration: number;
  spotifyId?: string | null;
  artistId: string;
  albumId: string;
};

export type Stream = {
  id: string;
  userId: string;
  trackId: string;
  playedAt: Date;
  duration: number;
};

export type Import = {
  id: string;
  userId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileName: string;
  createdAt: Date;
};
