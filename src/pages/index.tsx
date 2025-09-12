import Head from 'next/head';
import Navbar from '../components/Navbar';
import MemeGenerator from '../components/MemeGenerator';

export default function Home() {

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>MemeMe - AI Meme Generator</title>
        <meta name="description" content="Generate hilarious memes with AI - FREE authentication with Google & email!" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navbar />
      
      <main>
        <MemeGenerator />
      </main>
    </div>
  );
}
