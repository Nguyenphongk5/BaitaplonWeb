using System.Collections.Concurrent;
using System.Threading.Channels;

namespace BaitaplonWeb.Data;

public sealed class OrderStatusNotifier
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, Channel<OrderStatusUpdate>>> subscribers = new(StringComparer.Ordinal);
    private readonly object subscriberLock = new();

    public OrderStatusSubscription Subscribe(string userId)
    {
        var channel = Channel.CreateBounded<OrderStatusUpdate>(new BoundedChannelOptions(32)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        });
        var subscriptionId = Guid.NewGuid();
        ConcurrentDictionary<Guid, Channel<OrderStatusUpdate>> userSubscribers;
        lock (subscriberLock)
        {
            userSubscribers = subscribers.GetOrAdd(userId, _ => new ConcurrentDictionary<Guid, Channel<OrderStatusUpdate>>());
            userSubscribers[subscriptionId] = channel;
        }

        return new OrderStatusSubscription(channel.Reader, () =>
        {
            lock (subscriberLock)
            {
                if (userSubscribers.TryRemove(subscriptionId, out var removed))
                {
                    removed.Writer.TryComplete();
                }

                if (userSubscribers.IsEmpty)
                {
                    subscribers.TryRemove(new KeyValuePair<string, ConcurrentDictionary<Guid, Channel<OrderStatusUpdate>>>(userId, userSubscribers));
                }
            }
        });
    }

    public void Notify(OrderStatusUpdate update)
    {
        if (string.IsNullOrEmpty(update.UserId)
            || !subscribers.TryGetValue(update.UserId, out var userSubscribers))
        {
            return;
        }

        foreach (var channel in userSubscribers.Values)
        {
            channel.Writer.TryWrite(update);
        }
    }
}

public sealed record OrderStatusUpdate(string UserId, int OrderId, string Status, DateTime UpdatedAtUtc);

public sealed class OrderStatusSubscription(ChannelReader<OrderStatusUpdate> reader, Action dispose) : IDisposable
{
    public ChannelReader<OrderStatusUpdate> Reader { get; } = reader;

    public void Dispose() => dispose();
}
