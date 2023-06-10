import Link from "next/link";
import Image from "next/image";
import { useUser } from "@auth0/nextjs-auth0/client";

export default function Home() {
  const { user } = useUser();
  console.log("🚀 ~ file: index.js:6 ~ Home ~ user:", user);
  return (
    <div>
      <h1>this is the Homepage</h1>
      <div>
        {!!user ? (
          <div>
            <div>
              <Image
                src={user.picture}
                alt={user.name}
                width={50}
                height={50}
              />
              <div>{user.email}</div>
            </div>
            <Link href="/api/auth/logout">Logout</Link>
          </div>
        ) : (
          <Link href="/api/auth/login">Login</Link>
        )}
      </div>
    </div>
  );
}
