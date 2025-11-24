import PublicMapView from '@/components/public-map-view';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-7xl">
        <PublicMapView />
      </div>
    </main>
  );
}
