let collectionReadQueue: Promise<void> = Promise.resolve();

/**
 * Serializes Dataverse collection reads for the published Power Apps provider bridge.
 * The bridge can time out when several retrieveMultipleRecords calls start together.
 * Failures release the queue so later reads are never blocked.
 */
export function queueDataverseCollectionRead<T>(read: () => Promise<T>): Promise<T> {
  const queuedRead = collectionReadQueue.then(read, read);
  collectionReadQueue = queuedRead.then(
    () => undefined,
    () => undefined,
  );
  return queuedRead;
}
