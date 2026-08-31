import { apiClient } from './client';

export type InvitationStatus = 'NA' | 'INVITED' | 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface Invitation {
  code?: string;
  issuedAt?: string;
  expiresAt?: string;
  validity?: string;
  count?: number;
  status?: InvitationStatus | Record<string, string>;
  comments?: string;
  respondedAt?: string;
}

export interface ParticipantVM {
  id: string;
  auctionId?: string;
  emailId?: string;
  username?: string;
  mobileNo?: string;
  name?: string;
  alias?: string;
  profilePicture?: string;
  avatar?: string;
  invitation?: Invitation;
}

export interface PaginatedParticipants {
  content?: ParticipantVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
    isFirst?: boolean;
    isLast?: boolean;
  };
}

/** POST /api/v1/auctions/{id}/participants/invitations — invite one person by email or mobile. */
export interface InvitationRQ {
  emailId?: string;
  mobileNo?: string;
  forceReInvite?: boolean;
}

export interface GetParticipantsFilter {
  phrases?: string[];
  invitationStatus?: InvitationStatus;
  page?: number;
  size?: number;
}

export const participantsApi = {
  /** Invites one person (existing user or not) to a restricted-access auction. */
  inviteParticipant: async (auctionId: string, data: InvitationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${auctionId}/participants/invitations`, data);
  },

  getAllParticipants: async (
    auctionId: string,
    filter: GetParticipantsFilter = {},
  ): Promise<PaginatedParticipants> => {
    const { phrases, invitationStatus, page = 0, size = 20 } = filter;
    const response = await apiClient.get<PaginatedParticipants>(
      `/api/v1/auctions/${auctionId}/participants`,
      {
        params: {
          page,
          size,
          ...(phrases?.length ? { phrases } : {}),
          ...(invitationStatus ? { invitationStatus } : {}),
        },
      },
    );
    return response.data;
  },

  getParticipantById: async (id: string): Promise<ParticipantVM> => {
    const response = await apiClient.get<ParticipantVM>(`/api/v1/auctions/participants/${id}`);
    return response.data;
  },

  deleteParticipant: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/participants/${id}`);
  },

  deleteAllParticipants: async (auctionId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${auctionId}/participants`);
  },

  /** Self-service: the logged-in user accepts their own invitation to an auction. */
  acceptInvitation: async (
    auctionId: string,
    data: { loginName: string; code: string },
  ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${auctionId}/participants/me/invitations/accept`, data);
  },

  /** Self-service: the logged-in user declines their own invitation to an auction. */
  declineInvitation: async (
    auctionId: string,
    data: { loginName: string; comments: string },
  ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${auctionId}/participants/me/invitations/decline`, data);
  },
};
