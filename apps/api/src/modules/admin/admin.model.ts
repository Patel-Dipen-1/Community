export interface IVerificationQueueItem {
  userId: string;
  ownerName: string;
  shopName: string;
  gstNumber?: string;
  address: string;
  shopPhotosAndVideos: { type: string; url: string }[];
  registeredAt: Date;
}
