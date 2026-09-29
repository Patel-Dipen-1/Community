export interface IGroupMember {
  userId: string;
  fullName: string;
  mobileNumber: string;
  roleInGroup: 'ADMIN' | 'MEMBER';
  joinedAt: Date;
}

export interface IGroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string; // Visible to Group Admin only when hideMemberIdentity is ON
  text?: string;
  productCode?: string;
  mediaUrl?: string;
  createdAt: Date;
}

export interface IGroup {
  id: string;
  title: string;
  description?: string;
  type: 'GROUP' | 'BROADCAST';
  createdById: string;
  maxCapacity: number;                // Super Admin default max capacity (e.g. 40 max)
  onlyAdminCanPost: boolean;          // Only Admin can post
  hideMemberIdentity: boolean;        // ON: Normal members see "Member (Identity Protected)"; OFF: Real names shown
  membersCanSeeMemberList: boolean;   // ON: Members see full member list; OFF: Only Group Admin sees member list
  members: IGroupMember[];
  messages: IGroupMessage[];
  isDeleted?: boolean;
  createdAt: Date;
}

