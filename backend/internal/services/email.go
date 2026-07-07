package services

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"regexp"
	"strings"

	"github.com/chainproof/baas/internal/config"
)

var fromEmailRe = regexp.MustCompile(`<([^>]+)>`)

type EmailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) *EmailService {
	return &EmailService{cfg: cfg}
}

func (s *EmailService) Enabled() bool {
	return s.cfg.MailHost != "" && s.cfg.MailUsername != ""
}

func (s *EmailService) Send(to, subject, htmlBody string) error {
	if !s.Enabled() {
		fmt.Printf("[email-dev] To: %s | %s\n%s\n", to, subject, htmlBody)
		return fmt.Errorf("email not configured: set MAIL_HOST and MAIL_USERNAME")
	}
	displayFrom := s.cfg.MailFrom
	if displayFrom == "" {
		displayFrom = s.cfg.MailUsername
	}
	smtpFrom := parseFromEmail(displayFrom)
	if smtpFrom == "" {
		smtpFrom = s.cfg.MailUsername
	}
	msg := bytes.NewBufferString(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n%s",
		displayFrom, to, subject, htmlBody,
	))
	addr := fmt.Sprintf("%s:%d", s.cfg.MailHost, s.cfg.MailPort)
	auth := smtp.PlainAuth("", s.cfg.MailUsername, s.cfg.MailPassword, s.cfg.MailHost)

	switch strings.ToLower(s.cfg.MailEncryption) {
	case "ssl", "smtps":
		return sendMailImplicitTLS(addr, auth, smtpFrom, []string{to}, msg.Bytes(), s.tlsServerName())
	case "tls", "starttls":
		return sendMailSTARTTLS(addr, auth, smtpFrom, []string{to}, msg.Bytes(), s.tlsServerName())
	default:
		return smtp.SendMail(addr, auth, smtpFrom, []string{to}, msg.Bytes())
	}
}

func (s *EmailService) tlsServerName() string {
	if s.cfg.MailTLSServerName != "" {
		return s.cfg.MailTLSServerName
	}
	host, _, err := net.SplitHostPort(fmt.Sprintf("%s:%d", s.cfg.MailHost, s.cfg.MailPort))
	if err != nil {
		return s.cfg.MailHost
	}
	return host
}

// sendMailImplicitTLS — port 465 (SMTPS)
func sendMailImplicitTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte, serverName string) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: serverName})
	if err != nil {
		return fmt.Errorf("tls dial: %w", err)
	}
	host, _, _ := net.SplitHostPort(addr)
	if host == "" {
		host = serverName
	}
	return sendSMTPClient(conn, host, auth, from, to, msg, serverName)
}

// sendMailSTARTTLS — port 587 (most hosting providers)
func sendMailSTARTTLS(addr string, auth smtp.Auth, from string, to []string, msg []byte, serverName string) error {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("dial: %w", err)
	}
	host, _, _ := net.SplitHostPort(addr)
	if host == "" {
		host = serverName
	}
	return sendSMTPClient(conn, host, auth, from, to, msg, serverName)
}

func sendSMTPClient(conn net.Conn, host string, auth smtp.Auth, from string, to []string, msg []byte, serverName string) error {
	client, err := smtp.NewClient(conn, host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Close()

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: serverName}); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("auth: %w", err)
		}
	}
	if err := client.Mail(from); err != nil {
		return fmt.Errorf("mail from: %w", err)
	}
	for _, r := range to {
		if err := client.Rcpt(r); err != nil {
			return fmt.Errorf("rcpt %s: %w", r, err)
		}
	}
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("data: %w", err)
	}
	if _, err := w.Write(msg); err != nil {
		return fmt.Errorf("write: %w", err)
	}
	if err := w.Close(); err != nil {
		return fmt.Errorf("close data: %w", err)
	}
	return client.Quit()
}

func parseFromEmail(from string) string {
	from = strings.TrimSpace(from)
	if m := fromEmailRe.FindStringSubmatch(from); len(m) == 2 {
		return strings.TrimSpace(m[1])
	}
	return from
}

func EmailTemplate(title, bodyHTML, ctaLabel, ctaURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html><html><body style="margin:0;background:#0A0D12;font-family:Inter,Arial,sans-serif">
<table width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="560" style="background:#12161D;border:1px solid #262E3A;border-radius:12px;overflow:hidden">
<tr><td style="padding:28px 32px;border-bottom:1px solid #262E3A">
<table><tr>
<td style="width:40px;height:40px;background:#17B8A6;border-radius:10px;text-align:center;vertical-align:middle;color:#fff;font-weight:700">CP</td>
<td style="padding-left:12px;color:#fff;font-size:18px;font-weight:600">ChainProof</td>
</tr></table></td></tr>
<tr><td style="padding:32px"><h1 style="margin:0 0 16px;color:#fff;font-size:22px">%s</h1>
<div style="color:#5B677A;font-size:15px;line-height:1.6">%s</div>
%s
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #262E3A;color:#5B677A;font-size:12px">
Tamper-proof records on Hyperledger Fabric · <a href="https://chainproof.io" style="color:#17B8A6">chainproof.io</a>
</td></tr></table></td></tr></table></body></html>`,
		title, bodyHTML, ctaButton(ctaLabel, ctaURL))
}

func ctaButton(label, url string) string {
	if label == "" || url == "" {
		return ""
	}
	return fmt.Sprintf(`<p style="margin:28px 0 0"><a href="%s" style="display:inline-block;background:#17B8A6;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">%s</a></p>`, url, label)
}
