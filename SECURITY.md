# Security

RSS input is untrusted. The integration only accepts public HTTP(S) addresses on ports 80/443 and prevents DNS resolution into private/reserved networks. Feed content is parsed as XML and converted to plain headline strings; unsafe links are filtered.

Do not share credentials or private URLs in public issues. If you find a security problem, use GitHub private vulnerability reporting if enabled; otherwise open an issue with no exploit details to request a secure contact channel. This community beta is not a security notification system.
