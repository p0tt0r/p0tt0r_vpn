import { Injectable } from '@nestjs/common';
import { Client } from 'ssh2';
import { readFileSync } from 'fs';

type XrayClient = {
  id: string;
  flow: string;
};

@Injectable()
export class SshService {
  private readonly host = process.env.VPS_HOST!;
  private readonly port = Number(process.env.VPS_PORT || 22);
  private readonly username = process.env.VPS_USER!;
  private readonly privateKey = readFileSync(
    process.env.VPS_SSH_PRIVATE_KEY_PATH!,
    'utf8',
  );

  private execCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const conn = new Client();
      let stdout = '';
      let stderr = '';

      conn
        .on('ready', () => {
          conn.exec(command, (err, stream) => {
            if (err) {
              conn.end();
              reject(err);
              return;
            }

            stream
              .on('close', (code: number) => {
                conn.end();

                if (code !== 0 && stderr.trim()) {
                  reject(new Error(stderr));
                  return;
                }

                resolve(stdout.trim());
              })
              .on('data', (data: Buffer) => {
                stdout += data.toString();
              });

            stream.stderr.on('data', (data: Buffer) => {
              stderr += data.toString();
            });
          });
        })
        .on('error', (err) => reject(err))
        .connect({
          host: this.host,
          port: this.port,
          username: this.username,
          privateKey: this.privateKey,
        });
    });
  }

  async syncXrayClients(clients: XrayClient[]) {
    const payload = Buffer.from(JSON.stringify(clients), 'utf8').toString(
      'base64',
    );

    const command = `
python3 - <<'PY'
import json, base64

template_path = "/usr/local/etc/xray/config.template.json"
clients_path = "/usr/local/etc/xray/clients.json"
config_path = "/usr/local/etc/xray/config.json"

clients = json.loads(base64.b64decode("${payload}").decode("utf-8"))

with open(template_path, "r", encoding="utf-8") as f:
    config = json.load(f)

config["inbounds"][0]["settings"]["clients"] = clients

with open(clients_path, "w", encoding="utf-8") as f:
    json.dump(clients, f, indent=2)

with open(config_path, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2)

print("CONFIG_WRITTEN")
PY
/usr/local/bin/xray run -test -config /usr/local/etc/xray/config.json
systemctl restart xray
systemctl is-active xray
`;

    return this.execCommand(command);
  }

  async getXrayStatus() {
    const command = `
systemctl is-active xray
python3 - <<'PY'
import json

clients_path = "/usr/local/etc/xray/clients.json"

try:
    with open(clients_path, "r", encoding="utf-8") as f:
        clients = json.load(f)
    print("CLIENTS_COUNT=" + str(len(clients)))
except Exception:
    print("CLIENTS_COUNT=0")
PY
`;

    return this.execCommand(command);
  }

  async hasClient(uuid: string) {
    const escapedUuid = uuid.replace(/"/g, '\\"');

    const command = `
python3 - <<'PY'
import json

uuid = "${escapedUuid}"
clients_path = "/usr/local/etc/xray/clients.json"

try:
    with open(clients_path, "r", encoding="utf-8") as f:
        clients = json.load(f)
    exists = any(c.get("id") == uuid for c in clients)
    print("FOUND=" + ("true" if exists else "false"))
except Exception:
    print("FOUND=false")
PY
`;

    return this.execCommand(command);
  }
}