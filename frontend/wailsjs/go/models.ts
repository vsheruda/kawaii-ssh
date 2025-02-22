export namespace models {
	
	export class Application {
	    id: string;
	    name: string;
	    tunnel_ids: string[];
	
	    static createFrom(source: any = {}) {
	        return new Application(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.tunnel_ids = source["tunnel_ids"];
	    }
	}
	export class ConnectPayload {
	    Host: string;
	    Username: string;
	    KeyPath: string;
	    LocalPort: string;
	    RemotePort: string;
	    RemoteDestination: string;
	
	    static createFrom(source: any = {}) {
	        return new ConnectPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Host = source["Host"];
	        this.Username = source["Username"];
	        this.KeyPath = source["KeyPath"];
	        this.LocalPort = source["LocalPort"];
	        this.RemotePort = source["RemotePort"];
	        this.RemoteDestination = source["RemoteDestination"];
	    }
	}
	export class ConnectResponse {
	    id: string;
	    messages: string[];
	    responseMessage: string;
	    responseCode: number;
	
	    static createFrom(source: any = {}) {
	        return new ConnectResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.messages = source["messages"];
	        this.responseMessage = source["responseMessage"];
	        this.responseCode = source["responseCode"];
	    }
	}
	export class ConnectionStateResponse {
	    id: string;
	    messages: string[];
	    is_connected: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ConnectionStateResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.messages = source["messages"];
	        this.is_connected = source["is_connected"];
	    }
	}
	export class OpenTunnel {
	    pid: string;
	    username: string;
	    host: string;
	    keyPath: string;
	    localPort: string;
	    remotePort: string;
	    remoteDestination: string;
	
	    static createFrom(source: any = {}) {
	        return new OpenTunnel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pid = source["pid"];
	        this.username = source["username"];
	        this.host = source["host"];
	        this.keyPath = source["keyPath"];
	        this.localPort = source["localPort"];
	        this.remotePort = source["remotePort"];
	        this.remoteDestination = source["remoteDestination"];
	    }
	}
	export class ViewSettings {
	    grouped: boolean;
	    compact: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ViewSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.grouped = source["grouped"];
	        this.compact = source["compact"];
	    }
	}
	export class Tunnel {
	    id: string;
	    ssh_configuration_name: string;
	    local_port: string;
	    remote_port: string;
	    remote_destination: string;
	
	    static createFrom(source: any = {}) {
	        return new Tunnel(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.ssh_configuration_name = source["ssh_configuration_name"];
	        this.local_port = source["local_port"];
	        this.remote_port = source["remote_port"];
	        this.remote_destination = source["remote_destination"];
	    }
	}
	export class SSHConfiguration {
	    name: string;
	    host: string;
	    username: string;
	    key_path: string;
	
	    static createFrom(source: any = {}) {
	        return new SSHConfiguration(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.host = source["host"];
	        this.username = source["username"];
	        this.key_path = source["key_path"];
	    }
	}
	export class Profile {
	    ssh_configurations: SSHConfiguration[];
	    tunnels: Tunnel[];
	    view_settings: ViewSettings;
	    applications: Application[];
	
	    static createFrom(source: any = {}) {
	        return new Profile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.ssh_configurations = this.convertValues(source["ssh_configurations"], SSHConfiguration);
	        this.tunnels = this.convertValues(source["tunnels"], Tunnel);
	        this.view_settings = this.convertValues(source["view_settings"], ViewSettings);
	        this.applications = this.convertValues(source["applications"], Application);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProfileResponse {
	    responseCode: number;
	    profile: Profile;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new ProfileResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.responseCode = source["responseCode"];
	        this.profile = this.convertValues(source["profile"], Profile);
	        this.version = source["version"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class SystemHealthResponse {
	    responseCode: number;
	    openTunnels: OpenTunnel[];
	
	    static createFrom(source: any = {}) {
	        return new SystemHealthResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.responseCode = source["responseCode"];
	        this.openTunnels = this.convertValues(source["openTunnels"], OpenTunnel);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	

}

